"""
Production Security & Rate Limiting Module.
Provides in-memory sliding window rate limiting and SSRF protection for webhooks.
"""

import time
import ipaddress
import urllib.parse
from collections import defaultdict
from fastapi import Request, HTTPException, status

# Sliding window rate limit storage: {bucket_key: [timestamps]}
_rate_limit_records: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(key: str, max_requests: int, window_seconds: int):
    """
    In-memory sliding window rate limiter.
    Raises HTTPException 429 if request count exceeds max_requests within window_seconds.
    """
    now = time.time()
    cutoff = now - window_seconds
    timestamps = _rate_limit_records[key]

    # Filter out timestamps older than the cutoff
    _rate_limit_records[key] = [t for t in timestamps if t > cutoff]

    if len(_rate_limit_records[key]) >= max_requests:
        retry_after = int(window_seconds - (now - _rate_limit_records[key][0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Please wait {max(retry_after, 1)} seconds before trying again.",
            headers={"Retry-After": str(max(retry_after, 1))}
        )

    _rate_limit_records[key].append(now)


def get_client_ip(request: Request) -> str:
    """Extract client IP handling reverse proxies (X-Forwarded-For)."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def validate_webhook_url_ssrf(url_str: str | None) -> None:
    """
    Validate that a webhook URL is a safe public HTTPS/HTTP endpoint.
    Blocks localhost, private IP ranges (RFC 1918), and cloud metadata endpoints (169.254.169.254).
    """
    if not url_str or not url_str.strip():
        return

    url = url_str.strip()
    parsed = urllib.parse.urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook URL must use http or https scheme."
        )

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook URL hostname."
        )

    # Disallow localhost / loopback aliases
    if hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook URL cannot point to localhost or internal loopback addresses."
        )

    # Check for direct IP address targets
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Webhook URL cannot point to private or internal IP addresses."
            )
        # Block cloud instance metadata IP directly
        if str(ip) == "169.254.169.254":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Webhook URL cannot point to cloud metadata services."
            )
    except ValueError:
        # Not a raw IP address; hostname looks like a standard domain name
        pass
