"""
Turns an uploaded file on disk into a list of {"text": str, "page": int} blocks.
Keeping page numbers around lets us cite "source.pdf, page 4" later in the UI.
"""
from pathlib import Path

from pypdf import PdfReader


def parse_document(file_path: str) -> list[dict]:
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        return _parse_pdf(file_path)
    if ext in (".txt", ".md"):
        return _parse_txt(file_path)
    if ext == ".docx":
        return _parse_docx(file_path)
    raise ValueError(f"Unsupported file type: {ext}")


def _parse_pdf(file_path: str) -> list[dict]:
    reader = PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append({"text": text, "page": i + 1})
    return pages


def _parse_txt(file_path: str) -> list[dict]:
    text = Path(file_path).read_text(encoding="utf-8", errors="ignore").strip()
    return [{"text": text, "page": 1}] if text else []


def _parse_docx(file_path: str) -> list[dict]:
    from docx import Document  # python-docx

    doc = Document(file_path)
    text = "\n".join(p.text for p in doc.paragraphs).strip()
    return [{"text": text, "page": 1}] if text else []
