"""
app/services/parser_service.py
-------------------------------
Extracts plain text from uploaded documents.

Supported formats:
  - PDF  → PyMuPDF (fitz)
  - DOCX → python-docx
  - TXT  → built-in read

Each extraction function returns a list of ``(page_number, text)`` tuples
so downstream chunking can preserve page-level provenance.
"""

from __future__ import annotations

from pathlib import Path
from typing import NamedTuple

import fitz  # PyMuPDF
from docx import Document as DocxDocument

from app.core.logger import get_logger

logger = get_logger(__name__)


class PageText(NamedTuple):
    """A single extracted page / section of text."""

    page_number: int   # 1-indexed
    text: str


class ParseResult(NamedTuple):
    pages: list[PageText]
    page_count: int
    full_text: str


# ── PDF ───────────────────────────────────────────────────────────────────────

def _parse_pdf(path: Path) -> ParseResult:
    """
    Extract text from a PDF using PyMuPDF.

    Each PDF page becomes one ``PageText`` entry.
    """
    pages: list[PageText] = []
    with fitz.open(str(path)) as doc:
        for i, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            if text:
                pages.append(PageText(page_number=i, text=text))

    page_count = len(pages)
    full_text = "\n\n".join(p.text for p in pages)
    logger.debug("PDF parsed", extra={"path": str(path), "pages": page_count})
    return ParseResult(pages=pages, page_count=page_count, full_text=full_text)


# ── DOCX ──────────────────────────────────────────────────────────────────────

def _parse_docx(path: Path) -> ParseResult:
    """
    Extract text from a DOCX using python-docx.

    Paragraphs are grouped into logical "pages" of ~50 paragraphs each
    to give an approximate page provenance without real page-break info.
    """
    doc = DocxDocument(str(path))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

    # Group into pseudo-pages (50 paragraphs ≈ 1 page heuristic)
    PAGE_SIZE = 50
    pages: list[PageText] = []
    for i in range(0, max(len(paragraphs), 1), PAGE_SIZE):
        chunk = paragraphs[i: i + PAGE_SIZE]
        text = "\n".join(chunk)
        page_num = (i // PAGE_SIZE) + 1
        if text:
            pages.append(PageText(page_number=page_num, text=text))

    if not pages:
        pages = [PageText(page_number=1, text="")]

    full_text = "\n\n".join(p.text for p in pages)
    logger.debug(
        "DOCX parsed",
        extra={"path": str(path), "paragraphs": len(paragraphs), "pseudo_pages": len(pages)},
    )
    return ParseResult(pages=pages, page_count=len(pages), full_text=full_text)


# ── TXT ───────────────────────────────────────────────────────────────────────

def _parse_txt(path: Path) -> ParseResult:
    """
    Read a plain-text file and split it into logical pages.

    Lines are grouped into blocks of 100 lines per "page".
    """
    raw = path.read_text(encoding="utf-8", errors="replace")
    lines = raw.splitlines()

    PAGE_LINES = 100
    pages: list[PageText] = []
    for i in range(0, max(len(lines), 1), PAGE_LINES):
        block = "\n".join(lines[i: i + PAGE_LINES]).strip()
        page_num = (i // PAGE_LINES) + 1
        if block:
            pages.append(PageText(page_number=page_num, text=block))

    if not pages:
        pages = [PageText(page_number=1, text=raw.strip())]

    full_text = "\n\n".join(p.text for p in pages)
    logger.debug("TXT parsed", extra={"path": str(path), "pseudo_pages": len(pages)})
    return ParseResult(pages=pages, page_count=len(pages), full_text=full_text)


# ── Public API ────────────────────────────────────────────────────────────────

_PARSERS = {
    "pdf": _parse_pdf,
    "docx": _parse_docx,
    "txt": _parse_txt,
}


def parse_document(file_path: str, file_type: str) -> ParseResult:
    """
    Dispatch to the correct parser based on *file_type*.

    Parameters
    ----------
    file_path:
        Absolute or relative path to the saved file.
    file_type:
        One of ``"pdf"``, ``"docx"``, ``"txt"``.

    Returns
    -------
    ParseResult
        Named tuple with ``pages``, ``page_count``, and ``full_text``.

    Raises
    ------
    ValueError
        If *file_type* is not recognised.
    RuntimeError
        If parsing fails for any reason.
    """
    parser = _PARSERS.get(file_type)
    if parser is None:
        raise ValueError(f"No parser registered for file type: '{file_type}'")

    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    try:
        result = parser(path)
        logger.info(
            "Document parsed successfully",
            extra={"file_type": file_type, "page_count": result.page_count},
        )
        return result
    except Exception as exc:
        logger.error("Document parsing failed", extra={"path": file_path, "error": str(exc)})
        raise RuntimeError(f"Failed to parse '{file_path}': {exc}") from exc
