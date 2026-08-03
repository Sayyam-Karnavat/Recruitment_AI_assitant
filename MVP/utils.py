"""
Utility functions for file parsing and text cleaning.
"""

import re
import tempfile
from pathlib import Path
from fastapi import UploadFile

import fitz  # PyMuPDF
import docx2txt


def remove_extra_space(text: str) -> str:
    """Clean up excessive whitespace from extracted text."""
    cleaned = re.sub(r'\n{3,}', '\n\n', text.strip())
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
    return cleaned.strip()


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from a PDF file using PyMuPDF."""
    text = ""
    try:
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from a DOCX file."""
    try:
        return docx2txt.process(file_path)
    except Exception as e:
        print(f"Error reading DOCX: {e}")
        return ""


def parse_uploaded_file(file: UploadFile, raw_bytes: bytes) -> str:
    """
    Save uploaded file to temp, extract text, return cleaned text.
    Supports PDF and DOCX.
    """
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()

    if ext not in {".pdf", ".docx"}:
        return ""

    # Write to temp file
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    temp.write(raw_bytes)
    temp.close()

    # Extract text based on type
    if ext == ".pdf":
        text = extract_text_from_pdf(temp.name)
    else:
        text = extract_text_from_docx(temp.name)

    # Clean up
    import os
    os.unlink(temp.name)

    return remove_extra_space(text)
