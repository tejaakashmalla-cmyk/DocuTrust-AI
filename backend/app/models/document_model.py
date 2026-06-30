"""
app/models/document_model.py
-----------------------------
MongoDB document model for uploaded files.

Collections used: ``documents``
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentModel(BaseModel):
    """
    Represents a single uploaded document stored in MongoDB.
    """

    id: str = Field(..., alias="_id", description="Unique document identifier (UUID).")
    filename: str = Field(..., description="Original filename as uploaded by the user.")
    file_type: str = Field(..., description="Detected MIME-like type: pdf | docx | txt.")
    file_size_bytes: int = Field(..., description="File size in bytes.")
    storage_path: str = Field(..., description="Absolute path to the saved file on disk.")
    page_count: Optional[int] = Field(default=None, description="Number of pages (PDF) or sections.")
    chunk_count: Optional[int] = Field(default=None, description="Number of text chunks indexed.")
    status: ProcessingStatus = Field(
        default=ProcessingStatus.PENDING,
        description="Current processing status.",
    )
    error_message: Optional[str] = Field(default=None, description="Error detail if status=failed.")
    uploaded_at: datetime = Field(
        default_factory=lambda: datetime.now(tz=timezone.utc),
        description="UTC timestamp of the upload.",
    )
    processed_at: Optional[datetime] = Field(
        default=None,
        description="UTC timestamp when processing completed.",
    )

    model_config = {
        "populate_by_name": True,
        "use_enum_values": True,
        "json_encoders": {datetime: lambda v: v.isoformat()},
    }

    def to_mongo(self) -> dict:
        """Serialise for insertion into MongoDB (uses ``_id`` key)."""
        data = self.model_dump(by_alias=True)
        return data

    @classmethod
    def from_mongo(cls, data: dict) -> "DocumentModel":
        """Deserialise from a MongoDB document dict."""
        if data is None:
            raise ValueError("Cannot build DocumentModel from None.")
        # Ensure _id is a string
        if "_id" in data and not isinstance(data["_id"], str):
            data["_id"] = str(data["_id"])
        return cls(**data)
