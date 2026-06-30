"""
app/schemas/document_schema.py
--------------------------------
Pydantic schemas for the /documents endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DocumentSummary(BaseModel):
    """Compact representation of a document for list views."""

    document_id: str = Field(..., description="UUID of the document.")
    filename: str = Field(..., description="Original filename.")
    file_type: str = Field(..., description="File type: pdf | docx | txt.")
    file_size_bytes: int = Field(..., description="File size in bytes.")
    page_count: Optional[int] = Field(default=None)
    chunk_count: Optional[int] = Field(default=None)
    status: str = Field(..., description="Processing status.")
    uploaded_at: datetime = Field(..., description="UTC upload timestamp.")
    processed_at: Optional[datetime] = Field(default=None)


class DocumentDetail(DocumentSummary):
    """Full document detail including error message if any."""

    error_message: Optional[str] = Field(default=None)
    storage_path: str = Field(..., description="On-disk storage path.")


class DocumentListResponse(BaseModel):
    """Paginated / filtered list of documents."""

    total: int = Field(..., description="Total number of documents in the collection.")
    documents: list[DocumentSummary] = Field(..., description="List of document summaries.")


class DocumentDeleteResponse(BaseModel):
    """Returned after a successful document deletion."""

    document_id: str = Field(..., description="UUID of the deleted document.")
    message: str = Field(default="Document deleted successfully.")
