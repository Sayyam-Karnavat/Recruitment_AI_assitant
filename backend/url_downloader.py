import httpx
import re
import urllib.parse
import ipaddress
import socket
import logging
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
            return filename
    # Fallback to URL path
    clean_path = urllib.parse.urlparse(fallback_url).path
    filename = clean_path.split("/")[-1]
    return filename or "downloaded_resume"


async def download_file_from_url(url: str, custom_headers: dict | None = None) -> tuple[bytes, str]:
    """
    Downloads a file from a public or cloud URL with SSRF protection.
    Returns (raw_bytes, filename).
    """
    validate_url_safety(url)

    # Transform Google Drive direct view link to download link
    if "drive.google.com" in url:
        match = re.search(r"/d/([a-zA-Z0-9_-]+)", url)
        if match:
            file_id = match.group(1)
            url = f"https://drive.google.com/uc?export=download&id={file_id}"

    # Transform OneDrive share links to direct download if possible
    elif "1drv.ms" in url or "sharepoint.com" in url:
        if "download=1" not in url:
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}download=1"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }
    if custom_headers:
        headers.update(custom_headers)

    async with httpx.AsyncClient(follow_redirects=True, timeout=35.0) as client:
        logger.info(f"Downloading from verified URL: {url}")
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()

        # Check if Google served a virus scan confirmation page instead of the file
        if "drive.google.com" in url and "Google Drive - Virus scan warning" in resp.text:
            confirm_match = re.search(r"confirm=([0-9A-Za-z_]+)", resp.text)
            if confirm_match:
                confirm_token = confirm_match.group(1)
                retry_url = f"{url}&confirm={confirm_token}"
                resp = await client.get(retry_url, headers=headers)
                resp.raise_for_status()

        filename = extract_filename_from_headers(resp.headers, url)
        return resp.content, filename
