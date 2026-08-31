"""
File parsing utilities: PDF, DOCX, and ZIP extraction with safety checks.
"""

import hashlib
import re
import tempfile
import zipfile
from pathlib import Path

import fitz  # PyMuPDF
from docx import Document


# ──────────────────────────────────────────────
# Text Extraction
# ──────────────────────────────────────────────

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception:
        pass
    return _clean_text(text)


def extract_text_from_docx(file_path: str) -> str:
    try:
        doc = Document(file_path)
        text = "\n".join(para.text for para in doc.paragraphs)
        return _clean_text(text)
    except Exception:
        return ""


def extract_text(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext == ".docx":
        return extract_text_from_docx(file_path)
    return ""


def _clean_text(text: str) -> str:
    cleaned = re.sub(r'\n{3,}', '\n\n', text.strip())
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
    return cleaned.strip()


# ──────────────────────────────────────────────
# File Hashing
# ──────────────────────────────────────────────

def compute_file_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# ──────────────────────────────────────────────
# ZIP Handling
# ──────────────────────────────────────────────

MAX_ZIP_SIZE = 50 * 1024 * 1024  # 50MB
MAX_FILES_IN_ZIP = 100
MAX_SINGLE_FILE_SIZE = 5 * 1024 * 1024  # 5MB limit
MAX_PAGE_COUNT = 10
ALLOWED_EXTENSIONS = {".pdf", ".docx"}


def validate_resume_file(file_path: str, data_bytes: bytes = None) -> tuple[bool, str]:
    """
    Validate resume file size (< 5MB) and page count (<= 10 pages for PDF).
    Returns (is_valid, error_message).
    """
    # Size check
    if data_bytes and len(data_bytes) > MAX_SINGLE_FILE_SIZE:
        size_mb = len(data_bytes) / (1024 * 1024)
        return False, f"File exceeds maximum allowed size of 5MB (size: {size_mb:.1f}MB)."
    elif not data_bytes:
        p = Path(file_path)
        if p.exists() and p.stat().st_size > MAX_SINGLE_FILE_SIZE:
            size_mb = p.stat().st_size / (1024 * 1024)
            return False, f"File '{p.name}' exceeds maximum allowed size of 5MB (size: {size_mb:.1f}MB)."

    # Page count check for PDF files
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        try:
            doc = fitz.open(file_path)
            pages = len(doc)
            doc.close()
            if pages > MAX_PAGE_COUNT:
                return False, f"PDF file has {pages} pages, which exceeds the maximum limit of 10 pages."
        except Exception:
            pass

    return True, ""


def extract_files_from_zip(zip_bytes: bytes, output_dir: Path) -> list[Path]:
    """
    Safely extract PDF/DOCX files from a ZIP archive.
    Returns list of extracted file paths.
    """
    if len(zip_bytes) > MAX_ZIP_SIZE:
        raise ValueError(f"ZIP file exceeds maximum size of {MAX_ZIP_SIZE // (1024*1024)}MB")

    # Write to temp file for zipfile module
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    tmp.write(zip_bytes)
    tmp.close()

    extracted_paths = []
    try:
        with zipfile.ZipFile(tmp.name, "r") as zf:
            entries = [e for e in zf.infolist() if not e.is_dir()]

            # Filter to allowed extensions only
            valid_entries = [e for e in entries if Path(e.filename).suffix.lower() in ALLOWED_EXTENSIONS]

            if len(valid_entries) > MAX_FILES_IN_ZIP:
                raise ValueError(f"ZIP contains more than {MAX_FILES_IN_ZIP} valid files")

            for entry in valid_entries:
                # Security: reject path traversal
                if ".." in entry.filename or entry.filename.startswith("/"):
                    continue

                # Security: reject nested zips
                if entry.filename.lower().endswith(".zip"):
                    continue

                # Size check
                if entry.file_size > MAX_SINGLE_FILE_SIZE:
                    continue

                # Extract to output dir with flat filename (no nested dirs)
                safe_name = Path(entry.filename).name
                dest = output_dir / safe_name

                # Handle name collisions
                counter = 1
                while dest.exists():
                    stem = Path(safe_name).stem
                    suffix = Path(safe_name).suffix
                    dest = output_dir / f"{stem}_{counter}{suffix}"
                    counter += 1

                with zf.open(entry) as src:
                    dest.write_bytes(src.read())

                extracted_paths.append(dest)
    finally:
        Path(tmp.name).unlink(missing_ok=True)

    return extracted_paths


def is_valid_resume_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def is_zip_file(filename: str) -> bool:
    return Path(filename).suffix.lower() == ".zip"
