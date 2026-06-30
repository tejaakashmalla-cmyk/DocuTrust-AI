"""
app/utils/file_utils.py
------------------------
Utility functions for file handling, validation, and path management.
"""

from __future__ import annotations

import hashlib
import mimetypes
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

# Map extensions → internal type labels
_EXT_TYPE_MAP: dict[str, str] = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".txt": "txt",
}


def detect_file_type(filename: str) -> str:
    """
    Return a normalised file-type label (``pdf`` | ``docx`` | ``txt``).

    Raises
    ------
    HTTPException 415
        If the extension is not in the allowed set.
    """
    suffix = Path(filename).suffix.lower()
    if suffix not in _EXT_TYPE_MAP:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type '{suffix}'. "
                f"Allowed: {', '.join(_EXT_TYPE_MAP.keys())}"
            ),
        )
    return _EXT_TYPE_MAP[suffix]


def validate_file_size(size_bytes: int) -> None:
    """
    Raise HTTP 413 if the file exceeds the configured maximum size.

    Parameters
    ----------
    size_bytes:
        File size in bytes.
    """
    if size_bytes > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File size {size_bytes / (1024 * 1024):.2f} MB exceeds "
                f"the maximum allowed size of {settings.max_file_size_mb} MB."
            ),
        )


def generate_document_id() -> str:
    """Return a new UUID4 string for use as a document identifier."""
    return str(uuid.uuid4())


async def save_upload_file(upload_file: UploadFile, document_id: str) -> tuple[Path, int]:
    """
    Persist an uploaded file to disk inside the configured upload directory.

    The file is saved with the pattern ``{document_id}_{original_filename}``
    to avoid naming collisions while retaining readability.

    Parameters
    ----------
    upload_file:
        The FastAPI ``UploadFile`` object from the request.
    document_id:
        The UUID assigned to this document.

    Returns
    -------
    tuple[Path, int]
        ``(absolute_path, file_size_in_bytes)``
    """
    safe_name = Path(upload_file.filename or "unnamed").name  # strip path traversal
    dest_name = f"{document_id}_{safe_name}"
    dest_path = settings.upload_path / dest_name

    content = await upload_file.read()
    size = len(content)

    validate_file_size(size)

    dest_path.write_bytes(content)
    logger.info(
        "File saved to disk",
        extra={"path": str(dest_path), "size_bytes": size, "document_id": document_id},
    )
    return dest_path, size


def delete_upload_file(storage_path: str) -> bool:
    """
    Remove a file from disk.

    Parameters
    ----------
    storage_path:
        Absolute or relative path string returned by :func:`save_upload_file`.

    Returns
    -------
    bool
        ``True`` if the file was deleted, ``False`` if it did not exist.
    """
    p = Path(storage_path)
    if p.exists():
        p.unlink()
        logger.info("File deleted from disk", extra={"path": storage_path})
        return True
    logger.warning("File not found on disk — skipping deletion", extra={"path": storage_path})
    return False


def compute_sha256(path: Path) -> str:
    """Return the SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65_536), b""):
            h.update(chunk)
    return h.hexdigest()
