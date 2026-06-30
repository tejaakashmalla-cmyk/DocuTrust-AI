"""
app/routes/upload.py
---------------------
Document upload endpoint.

POST /upload
    - Accepts PDF, DOCX, TXT via multipart/form-data.
    - Saves file to disk.
    - Parses, chunks, embeds, and indexes content into ChromaDB.
    - Persists metadata to MongoDB.
    - Returns a full :class:`UploadResponse`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logger import get_logger
from app.db.mongodb import get_db
from app.models.document_model import DocumentModel, ProcessingStatus
from app.schemas.upload_schema import UploadResponse
from app.services.chunk_service import chunk_service
from app.services.document_service import document_service
from app.services.parser_service import parse_document
from app.services.vector_store_service import vector_store_service
from app.utils.file_utils import detect_file_type, generate_document_id, save_upload_file

logger = get_logger(__name__)

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post(
    "",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document",
    description=(
        "Upload a PDF, DOCX, or TXT document. The file is parsed, split into "
        "chunks, embedded with sentence-transformers, and indexed into ChromaDB. "
        "Metadata is persisted in MongoDB."
    ),
    responses={
        201: {"description": "Document uploaded and indexed successfully."},
        400: {"description": "Missing or invalid file."},
        413: {"description": "File exceeds the maximum allowed size."},
        415: {"description": "Unsupported file type."},
        500: {"description": "Server-side processing error."},
    },
)
async def upload_document(
    file: UploadFile = File(..., description="The document to upload (PDF / DOCX / TXT)."),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> UploadResponse:
    """
    Full ingestion pipeline:

    1. Validate file type and size.
    2. Save file to ``uploads/``.
    3. Insert a ``PENDING`` document record into MongoDB.
    4. Parse text using the appropriate parser.
    5. Chunk the extracted text.
    6. Embed chunks and upsert into ChromaDB.
    7. Update document status to ``COMPLETED`` in MongoDB.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided.",
        )

    # ── 1. Detect file type (validates extension) ──────────────────────────────
    file_type = detect_file_type(file.filename)
    document_id = generate_document_id()

    logger.info(
    "Uploading document",
    extra={
        "uploaded_filename": file.filename,
        "content_type": file.content_type,
        "size": file.size if hasattr(file, "size") else None,
    },
)

    # ── 2. Save to disk ────────────────────────────────────────────────────────
    storage_path, file_size = await save_upload_file(file, document_id)

    # ── 3. Create PENDING record ───────────────────────────────────────────────
    doc_model = DocumentModel(
        _id=document_id,
        filename=file.filename,
        file_type=file_type,
        file_size_bytes=file_size,
        storage_path=str(storage_path),
        status=ProcessingStatus.PENDING,
    )
    await document_service.create(db, doc_model)

    # ── 4–6. Parse → Chunk → Embed (wrapped in try for clean error handling) ───
       # ── 4–6. Parse → Chunk → Embed (wrapped in try for clean error handling) ───
    try:
        await document_service.update_status(
            db,
            document_id,
            ProcessingStatus.PROCESSING,
        )

        # Parse
        parse_result = parse_document(str(storage_path), file_type)

        # Chunk
        chunks = chunk_service.chunk_pages(
            pages=parse_result.pages,
            document_id=document_id,
            filename=file.filename,
        )

        # Index
        indexed_count = vector_store_service.add_chunks(chunks)

        # ── 7. Mark COMPLETED ────────────────────────────────────────────────
        await document_service.update_status(
            db,
            document_id,
            ProcessingStatus.COMPLETED,
            chunk_count=indexed_count,
            page_count=parse_result.page_count,
        )

        logger.info(
            "Document ingestion complete",
            extra={
                "document_id": document_id,
                "pages": parse_result.page_count,
                "chunks": indexed_count,
            },
        )

        return UploadResponse(
            document_id=document_id,
            filename=file.filename,
            file_type=file_type,
            file_size_bytes=file_size,
            page_count=parse_result.page_count,
            chunk_count=indexed_count,
            status=ProcessingStatus.COMPLETED,
            uploaded_at=doc_model.uploaded_at,
            message="Document uploaded and indexed successfully.",
        )

    except Exception as exc:
        import traceback

        traceback.print_exc()

        logger.error(
            "Document ingestion failed",
            extra={
                "document_id": document_id,
                "error": str(exc),
            },
        )

        await document_service.update_status(
            db,
            document_id,
            ProcessingStatus.FAILED,
            error_message=str(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc