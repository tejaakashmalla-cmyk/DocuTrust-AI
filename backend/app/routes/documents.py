"""
app/routes/documents.py
------------------------
Document management endpoints.

GET    /documents
GET    /documents/{id}
DELETE /documents/{id}
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logger import get_logger
from app.db.mongodb import get_db
from app.schemas.document_schema import (
    DocumentDeleteResponse,
    DocumentDetail,
    DocumentListResponse,
)
from app.services.document_service import document_service
from app.utils.file_utils import delete_upload_file

logger = get_logger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List all documents",
)
async def list_documents(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await document_service.list_all(
        db,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{document_id}",
    response_model=DocumentDetail,
    summary="Get document",
)
async def get_document(
    document_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    detail = await document_service.get_detail(
        db,
        document_id,
    )

    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    return detail


@router.delete(
    "/{document_id}",
    response_model=DocumentDeleteResponse,
    summary="Delete document",
)
async def delete_document(
    document_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await document_service.get_by_id(
        db,
        document_id,
    )

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    await document_service.delete(
        db,
        document_id,
    )

    try:
        delete_upload_file(doc.storage_path)
    except Exception as exc:
        logger.warning(f"Unable to delete file: {exc}")

    logger.info(f"Document {document_id} deleted successfully.")

    return DocumentDeleteResponse(
        document_id=document_id,
        message="Document deleted successfully.",
    )