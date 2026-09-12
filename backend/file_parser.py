"""
File parsing utilities: In-memory PDF, DOCX, and ZIP extraction with zero disk retention.
Stream -> Process -> DB -> Discard.
"""

import hashlib
import io
import re
import zipfile
from pathlib import Path

import fitz  # PyMuPDF
from docx import Document


MAX_ZIP_SIZE = 50 * 1024 * 1024  # 50MB
MAX_FILES_IN_ZIP = 100
MAX_SINGLE_FILE_SIZE = 5 * 1024 * 1024  # 5MB limit
MAX_PAGE_COUNT = 10
ALLOWED_EXTENSIONS = {".pdf", ".docx"}


# ──────────────────────────────────────────────
# In-Memory Text Extraction
# ──────────────────────────────────────────────

def extract_text_from_pdf_bytes(data: bytes) -> str:
    """Extract raw text from PDF bytes in memory."""
    text = ""
    try:
        doc = fitz.open(stream=data, filetype="pdf")
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception:
        pass
    return _clean_text(text)


def extract_text_from_docx_bytes(data: bytes) -> str:
    """Extract raw text from DOCX bytes in memory."""
    try:
        doc = Document(io.BytesIO(data))
        text = "\n".join(para.text for para in doc.paragraphs)
        return _clean_text(text)
    except Exception:
        return ""


def extract_text_from_bytes(data: bytes, filename: str) -> str:
    """Extract text from raw file bytes based on file extension."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf_bytes(data)
    elif ext == ".docx":
        return extract_text_from_docx_bytes(data)
    return ""


def extract_text(file_source: str | bytes, filename: str = "") -> str:
    """Extract text from file path or bytes."""
    if isinstance(file_source, bytes):
        return extract_text_from_bytes(file_source, filename)

    # If it's a string path
    path = Path(file_source)
    if not path.exists():
        return ""

    data = path.read_bytes()
    return extract_text_from_bytes(data, path.name)


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
# In-Memory Validation & ZIP Extraction
# ──────────────────────────────────────────────

def validate_resume_bytes(data_bytes: bytes, filename: str) -> tuple[bool, str]:
    """
    Validate resume in-memory size (< 5MB) and page count (<= 10 pages for PDF).
    Returns (is_valid, error_message).
    """
    if len(data_bytes) > MAX_SINGLE_FILE_SIZE:
        size_mb = len(data_bytes) / (1024 * 1024)
        return False, f"File '{filename}' exceeds maximum allowed size of 5MB ({size_mb:.1f}MB)."

    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        try:
            doc = fitz.open(stream=data_bytes, filetype="pdf")
            pages = len(doc)
            doc.close()
            if pages > MAX_PAGE_COUNT:
                return False, f"PDF file '{filename}' has {pages} pages, which exceeds the maximum limit of 10 pages."
        except Exception:
            return False, f"PDF file '{filename}' appears corrupted or unreadable."

    return True, ""


def validate_resume_file(file_path: str, data_bytes: bytes = None) -> tuple[bool, str]:
    """Legacy file validation wrapper."""
    if data_bytes:
        return validate_resume_bytes(data_bytes, Path(file_path).name)
    p = Path(file_path)
    if not p.exists():
        return False, "File does not exist"
    return validate_resume_bytes(p.read_bytes(), p.name)


def extract_files_from_zip_in_memory(zip_bytes: bytes) -> list[tuple[str, bytes]]:
    """
    Extract PDF/DOCX files from a ZIP archive directly into memory.
    Returns list of (filename, file_bytes). Zero disk write!
    """
    if len(zip_bytes) > MAX_ZIP_SIZE:
        raise ValueError(f"ZIP file exceeds maximum size of {MAX_ZIP_SIZE // (1024*1024)}MB")

    extracted = []
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        entries = [e for e in zf.infolist() if not e.is_dir()]
        valid_entries = [e for e in entries if Path(e.filename).suffix.lower() in ALLOWED_EXTENSIONS]

        if len(valid_entries) > MAX_FILES_IN_ZIP:
            raise ValueError(f"ZIP contains more than {MAX_FILES_IN_ZIP} valid files")

        seen_names = set()
        for entry in valid_entries:
            if ".." in entry.filename or entry.filename.startswith("/"):
                continue
            if entry.filename.lower().endswith(".zip"):
                continue
            if entry.file_size > MAX_SINGLE_FILE_SIZE:
                continue

            safe_name = Path(entry.filename).name
            counter = 1
            final_name = safe_name
            while final_name in seen_names:
                stem = Path(safe_name).stem
                suffix = Path(safe_name).suffix
                final_name = f"{stem}_{counter}{suffix}"
                counter += 1

            seen_names.add(final_name)
            with zf.open(entry) as f:
                extracted.append((final_name, f.read()))

    return extracted


def extract_files_from_zip(zip_bytes: bytes, output_dir: Path) -> list[Path]:
    """Legacy helper writing to disk (preserved if needed)."""
    extracted_items = extract_files_from_zip_in_memory(zip_bytes)
    paths = []
    output_dir.mkdir(parents=True, exist_ok=True)
    for name, data in extracted_items:
        dest = output_dir / name
        dest.write_bytes(data)
        paths.append(dest)
    return paths


def is_valid_resume_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def is_zip_file(filename: str) -> bool:
    return Path(filename).suffix.lower() == ".zip"
