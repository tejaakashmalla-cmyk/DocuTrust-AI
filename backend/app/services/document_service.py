"""
app/services/document_service.py
----------------------------------
Business logic for document metadata persistence in MongoDB.

All methods are async and operate on the ``documents`` collection.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logger import get_logger
from app.models.document_model import DocumentModel, ProcessingStatus
from app.schemas.document_schema import DocumentDetail, DocumentListResponse, DocumentSummary

logger = get_logger(__name__)

COLLECTION = "documents"


class DocumentService:
    """CRUD service for document metadata stored in MongoDB."""

    # ── Create ─────────────────────────────────────────────────────────────────

    async def create(self, db: AsyncIOMotorDatabase, doc: DocumentModel) -> DocumentModel:
        """
        Insert a new document record.

        Parameters
        ----------
        db:
            Active Motor database handle.
        doc:
            Fully populated :class:`DocumentModel`.

        Returns
        -------
        DocumentModel
            The inserted document.
        """
        data = doc.to_mongo()
        await db[COLLECTION].insert_one(data)
        logger.info("Document record created", extra={"document_id": doc.id})
        return doc

    # ── Read ───────────────────────────────────────────────────────────────────

    async def get_by_id(self, db: AsyncIOMotorDatabase, document_id: str) -> Optional[DocumentModel]:
        """
        Fetch a document by its UUID.

        Returns ``None`` if not found.
        """
        raw = await db[COLLECTION].find_one({"_id": document_id})
        if raw is None:
            return None
        return DocumentModel.from_mongo(raw)

    async def list_all(
        self,
        db: AsyncIOMotorDatabase,
        skip: int = 0,
        limit: int = 100,
    ) -> DocumentListResponse:
        """
        Return a paginated list of all documents.

        Parameters
        ----------
        db:
            Active Motor database handle.
        skip:
            Number of documents to skip (for pagination).
        limit:
            Maximum documents to return.

        Returns
        -------
        DocumentListResponse
            Contains total count and a list of :class:`DocumentSummary` objects.
        """
        total = await db[COLLECTION].count_documents({})
        cursor = db[COLLECTION].find({}).sort("uploaded_at", -1).skip(skip).limit(limit)
        docs = []
        async for raw in cursor:
            model = DocumentModel.from_mongo(raw)
            docs.append(
                DocumentSummary(
                    document_id=model.id,
                    filename=model.filename,
                    file_type=model.file_type,
                    file_size_bytes=model.file_size_bytes,
                    page_count=model.page_count,
                    chunk_count=model.chunk_count,
                    status=model.status,
                    uploaded_at=model.uploaded_at,
                    processed_at=model.processed_at,
                )
            )

        return DocumentListResponse(total=total, documents=docs)

    # ── Update ─────────────────────────────────────────────────────────────────

    async def update_status(
        self,
        db: AsyncIOMotorDatabase,
        document_id: str,
        status: ProcessingStatus,
        error_message: Optional[str] = None,
        chunk_count: Optional[int] = None,
        page_count: Optional[int] = None,
    ) -> None:
        """
        Patch a document's processing status and optional metadata.

        Parameters
        ----------
        db:
            Active Motor database handle.
        document_id:
            UUID of the target document.
        status:
            New :class:`ProcessingStatus` value.
        error_message:
            Error detail if *status* is ``FAILED``.
        chunk_count:
            Number of chunks produced (set after successful embedding).
        page_count:
            Number of pages extracted (set after parsing).
        """
        updates: dict = {"status": status}
        if error_message is not None:
            updates["error_message"] = error_message
        if chunk_count is not None:
            updates["chunk_count"] = chunk_count
        if page_count is not None:
            updates["page_count"] = page_count
        if status == ProcessingStatus.COMPLETED:
            updates["processed_at"] = datetime.now(tz=timezone.utc)

        await db[COLLECTION].update_one(
            {"_id": document_id},
            {"$set": updates},
        )
        logger.info(
            "Document status updated",
            extra={"document_id": document_id, "status": status},
        )

    # ── Delete ─────────────────────────────────────────────────────────────────

    async def delete(self, db: AsyncIOMotorDatabase, document_id: str) -> bool:
        """
        Delete a document record from MongoDB.

        Parameters
        ----------
        db:
            Active Motor database handle.
        document_id:
            UUID of the document to delete.

        Returns
        -------
        bool
            ``True`` if a record was deleted, ``False`` if not found.
        """
        result = await db[COLLECTION].delete_one({"_id": document_id})
        deleted = result.deleted_count > 0
        if deleted:
            logger.info("Document record deleted", extra={"document_id": document_id})
        else:
            logger.warning("Document record not found for deletion", extra={"document_id": document_id})
        return deleted

    # ── Detail view ────────────────────────────────────────────────────────────

    async def get_detail(self, db: AsyncIOMotorDatabase, document_id: str) -> Optional[DocumentDetail]:
        """
        Return a :class:`DocumentDetail` for a single document, or ``None``.
        """
        model = await self.get_by_id(db, document_id)
        if model is None:
            return None
        return DocumentDetail(
            document_id=model.id,
            filename=model.filename,
            file_type=model.file_type,
            file_size_bytes=model.file_size_bytes,
            page_count=model.page_count,
            chunk_count=model.chunk_count,
            status=model.status,
            uploaded_at=model.uploaded_at,
            processed_at=model.processed_at,
            error_message=model.error_message,
            storage_path=model.storage_path,
        )


# Module-level singleton
document_service = DocumentService()
