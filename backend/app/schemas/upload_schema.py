"""
app/schemas/upload_schema.py
-----------------------------
Pydantic schemas for the /upload endpoint.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    """Returned after a successful document upload and ingestion."""

    document_id: str = Field(..., description="UUID assigned to the document.")
    filename: str = Field(..., description="Original filename.")
    file_type: str = Field(..., description="Detected file type (pdf | docx | txt).")
    file_size_bytes: int = Field(..., description="File size in bytes.")
    page_count: Optional[int] = Field(default=None, description="Page / section count.")
    chunk_count: int = Field(..., description="Number of chunks indexed into the vector store.")
    status: str = Field(..., description="Processing status.")
    uploaded_at: datetime = Field(..., description="UTC timestamp of upload.")
    message: str = Field(default="Document uploaded and indexed successfully.")


class UploadErrorResponse(BaseModel):
    """Returned when upload or processing fails."""

    detail: str = Field(..., description="Human-readable error description.")
