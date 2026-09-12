import httpx
import re
import cgi
import logging

logger = logging.getLogger(__name__)

async def download_file_from_url(url: str) -> tuple[bytes, str]:
    """
    Downloads a file from a URL.
    Attempts to handle Google Drive URLs by converting them to direct download links.
    Returns (raw_bytes, filename).
    """
    # Simple heuristic to transform google drive URL to download URL
    if "drive.google.com" in url:
        match = re.search(r"/d/([a-zA-Z0-9_-]+)", url)
        if match:
            file_id = match.group(1)
            url = f"https://drive.google.com/uc?export=download&id={file_id}"
            
    async with httpx.AsyncClient(follow_redirects=True) as client:
        logger.info(f"Downloading from URL: {url}")
        resp = await client.get(url, timeout=30.0)
        resp.raise_for_status()
        
        filename = "downloaded_file"
        cd = resp.headers.get('content-disposition')
        if cd:
            _, params = cgi.parse_header(cd)
            filename = params.get("filename", filename)
        else:
            filename = url.split("/")[-1].split("?")[0]
            if not filename:
                filename = "downloaded_file"
                
        return resp.content, filename
