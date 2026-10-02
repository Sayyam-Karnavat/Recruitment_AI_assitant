import httpx
import re
import urllib.parse
import ipaddress
import socket
import logging
from pathlib import Path
from email.message import EmailMessage

logger = logging.getLogger(__name__)


def validate_url_safety(url: str):
    """
    SSRF Protection: Validates that the URL uses http/https and does not resolve
    to localhost, private IP space (RFC 1918), link-local, or cloud metadata services.
    """
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must use http or https scheme.")
    
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise ValueError("Invalid URL hostname.")
    
    blocked_hosts = {"localhost", "127.0.0.1", "::1", "metadata.google.internal"}
    if hostname in blocked_hosts or hostname.endswith(".local") or hostname.endswith(".internal"):
        raise ValueError(f"Access to host '{hostname}' is forbidden for security.")
    
    try:
        # Resolve hostname to IP addresses
        addr_info = socket.getaddrinfo(hostname, None)
        for _, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                raise ValueError(f"Access to private IP range ({ip_str}) is prohibited.")
    except socket.gaierror:
        pass


def extract_filename_from_headers(headers: dict, fallback_url: str) -> str:
    """Safely extracts filename from Content-Disposition header without deprecated cgi module."""
    cd = headers.get('content-disposition')
    if cd:
        msg = EmailMessage()
        msg['content-disposition'] = cd
        filename = msg.get_filename()
        if filename:
            filename = filename.strip('"\'')
            if filename.lower() not in ("view", "view.pdf", "uc", "uc.pdf", "download", "download.pdf"):
                return filename
    # Fallback to URL path
    clean_path = urllib.parse.urlparse(fallback_url).path
    filename = clean_path.split("/")[-1]
    if filename.lower() in ("uc", "view", "edit", "download", "view.pdf", "uc.pdf", ""):
        m = re.search(r"/d/([a-zA-Z0-9_-]+)", fallback_url) or re.search(r"[?&]id=([a-zA-Z0-9_-]+)", fallback_url)
        if m:
            return f"Google_Drive_{m.group(1)[:8]}.pdf"
        return "downloaded_resume.pdf"
    return filename or "downloaded_resume"


async def download_file_from_url(url: str, custom_headers: dict | None = None) -> tuple[bytes, str]:
    """
    Downloads a file from a public or cloud URL with SSRF protection.
    Returns (raw_bytes, filename).
    """
    validate_url_safety(url)

    original_url = url
    file_id = None

    # Transform Google Drive direct view or document link to download link
    if "drive.google.com" in url or "docs.google.com" in url:
        match = re.search(r"/d/([a-zA-Z0-9_-]+)", url) or re.search(r"[?&]id=([a-zA-Z0-9_-]+)", url)
        if match:
            file_id = match.group(1)
            if "docs.google.com/document" in url:
                url = f"https://docs.google.com/document/d/{file_id}/export?format=pdf"
            else:
                url = f"https://drive.google.com/uc?export=download&id={file_id}"

    # Transform OneDrive share links to direct download if possible
    elif "1drv.ms" in url or "sharepoint.com" in url:
        if "download=1" not in url:
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}download=1"

    headers = {
        "User-Agent": "UppshotBot/1.0 (https://uppshot.com; support@uppshot.com) Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
        "Accept": "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*",
    }
    if custom_headers:
        headers.update(custom_headers)

    async with httpx.AsyncClient(follow_redirects=True, timeout=35.0) as client:
        logger.info(f"Downloading from verified URL: {url}")
        resp = await client.get(url, headers=headers)
        
        if resp.status_code != 200:
            err_detail = resp.text
            try:
                err_data = resp.json()
                msg = err_data.get("error", {}).get("message")
                if msg:
                    err_detail = msg
            except Exception:
                pass

            is_gdrive = "drive.google.com" in url or "googleapis.com" in url or "docs.google.com" in url

            if resp.status_code == 403:
                if is_gdrive:
                    if "has not been used in project" in err_detail.lower() or "disabled" in err_detail.lower():
                        raise ValueError(
                            "Google Drive API is not enabled in your Google Cloud Project. Enable 'Google Drive API' in Google Cloud Console → APIs & Services → Library."
                        )
                    raise ValueError(
                        "Google Drive access denied (HTTP 403). If using a share link, ensure the file permission is set to 'Anyone with the link can view', or use the 'Browse & Select from Google Drive' button to authenticate."
                    )
                raise ValueError(
                    f"Access Forbidden (HTTP 403): The remote server denied access to this file. It may require authentication or permissions."
                )
            elif resp.status_code == 404:
                # If Google Drive download returned 404, try Google Docs export fallback
                if file_id and "export?format=pdf" not in url:
                    docs_url = f"https://docs.google.com/document/d/{file_id}/export?format=pdf"
                    docs_resp = await client.get(docs_url, headers=headers)
                    if docs_resp.status_code == 200 and docs_resp.content.startswith(b"%PDF"):
                        filename = extract_filename_from_headers(docs_resp.headers, docs_url)
                        return docs_resp.content, filename
                raise ValueError(
                    "File not found (HTTP 404): The provided URL does not exist or has expired."
                )
            elif resp.status_code == 401:
                raise ValueError(
                    "Unauthorized (HTTP 401): The link requires a login or authorization credentials."
                )
            resp.raise_for_status()

        # Handle Google Drive HTML responses (e.g. virus scan interstitial or login redirect)
        is_html = (
            resp.headers.get("content-type", "").lower().startswith("text/html")
            or resp.content.strip()[:64].lower().startswith(b"<!doctype html")
            or resp.content.strip()[:64].lower().startswith(b"<html")
        )
        if is_html and ("drive.google.com" in str(resp.url) or "googleusercontent.com" in str(resp.url) or file_id):
            resp_text = resp.text

            # 1. Check for Google Drive download confirmation interstitial
            confirm_match = re.search(r"confirm=([0-9A-Za-z_-]+)", resp_text) or re.search(r'name="confirm"[^>]+value="([^"]+)"', resp_text)
            if confirm_match and file_id:
                confirm_token = confirm_match.group(1)
                retry_url = f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm={confirm_token}"
                retry_resp = await client.get(retry_url, headers=headers)
                if retry_resp.status_code == 200 and not retry_resp.headers.get("content-type", "").lower().startswith("text/html"):
                    resp = retry_resp
                    is_html = False

            # 2. Check for form action or anchor link
            if is_html:
                action_match = re.search(r'action="(https://drive\.usercontent\.google\.com/download[^"]*)"', resp_text)
                if action_match:
                    hidden_params = {}
                    for input_m in re.finditer(r'<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"', resp_text):
                        hidden_params[input_m.group(1)] = input_m.group(2)
                    form_resp = await client.get(action_match.group(1), params=hidden_params, headers=headers)
                    if form_resp.status_code == 200 and not form_resp.headers.get("content-type", "").lower().startswith("text/html"):
                        resp = form_resp
                        is_html = False

            # 3. Check if it's a native Google Doc and export as PDF
            if is_html and file_id:
                docs_url = f"https://docs.google.com/document/d/{file_id}/export?format=pdf"
                docs_resp = await client.get(docs_url, headers=headers)
                if docs_resp.status_code == 200 and docs_resp.content.startswith(b"%PDF"):
                    resp = docs_resp
                    is_html = False

            # 4. If still HTML, verify whether it's a login / permission barrier
            if is_html:
                if "accounts.google.com" in resp_text or "ServiceLogin" in resp_text or "Sign in" in resp_text or "You need access" in resp_text:
                    raise ValueError(
                        "This Google Drive file is private. Please ensure file sharing is set to 'Anyone with the link can view' in Google Drive, or use the 'Browse & Select from Google Drive' button to authenticate."
                    )
                raise ValueError(
                    "The Google Drive link returned a web page instead of the file content. Please verify the link is public and set to 'Anyone with the link can view'."
                )

        filename = extract_filename_from_headers(resp.headers, original_url)

        # Enforce accurate extension based on raw binary signatures
        if resp.content.startswith(b"%PDF") and not filename.lower().endswith(".pdf"):
            filename = f"{Path(filename).stem}.pdf"
        elif resp.content.startswith(b"PK\x03\x04") and (b"word/" in resp.content[:4096] or b"[Content_Types].xml" in resp.content[:4096]):
            if not filename.lower().endswith(".docx"):
                filename = f"{Path(filename).stem}.docx"

        return resp.content, filename
