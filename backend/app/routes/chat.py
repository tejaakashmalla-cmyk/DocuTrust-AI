"""
app/routes/chat.py
-------------------
Chat / Q&A endpoint.

POST /chat
    Accepts a natural-language question, retrieves the most relevant
    document chunks from ChromaDB, and returns them as citations.

    When Ollama is enabled in ``answer_service.py``, this endpoint will also
    return a synthesised answer alongside the citations.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.logger import get_logger
from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.services.answer_service import answer_service
from app.services.citation_service import citation_service
from app.services.retrieval_service import retrieval_service

logger = get_logger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post(
    "",
    response_model=ChatResponse,
    summary="Ask a question",
    description=(
        "Submit a natural-language question. The system retrieves the most "
        "semantically relevant document chunks from the vector store and returns "
        "them as citations with relevance scores.\n\n"
        "**Note:** LLM answer synthesis is not yet active. Set up Ollama and "
        "update `answer_service.py` to enable it."
    ),
    responses={
        200: {"description": "Question answered with retrieved citations."},
        400: {"description": "Invalid request body."},
        422: {"description": "Validation error."},
        500: {"description": "Internal retrieval or generation error."},
    },
)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    RAG pipeline (current mode — retrieval only):

    1. Embed the question.
    2. Query ChromaDB for top-k similar chunks.
    3. Build citation objects.
    4. (Future) Pass chunks to Ollama for answer synthesis.
    5. Return response.
    """
    logger.info(
        "Chat request received",
        extra={
            "question_preview": request.question[:80],
            "top_k": request.top_k,
            "document_ids": request.document_ids,
        },
    )

    try:
        # ── 1–2. Retrieve chunks ───────────────────────────────────────────────
        chunks = retrieval_service.retrieve(
            query=request.question,
            top_k=request.top_k or settings.top_k_results,
            document_ids=request.document_ids,
        )

        if not chunks:
            logger.warning(
                "No chunks retrieved for question",
                extra={"question": request.question},
            )

        # ── 3. Build citations ─────────────────────────────────────────────────
        citations = citation_service.build_citations(chunks)

        # ── 4. Answer generation (stub / Ollama) ───────────────────────────────
        answer_result = await answer_service.generate(
            question=request.question,
            chunks=chunks,
        )

        # ── 5. Build response ──────────────────────────────────────────────────
        response = ChatResponse(
            question=request.question,
            answer=answer_result.answer,
            citations=citations,
            total_chunks_retrieved=len(citations),
            model_used=answer_result.model_used,
            note=answer_result.note,
        )

        logger.info(
            "Chat response built",
            extra={
                "chunks_returned": len(citations),
                "has_answer": answer_result.answer is not None,
            },
        )
        return response

    except Exception as exc:
        logger.error("Chat endpoint error", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat processing failed: {exc}",
        ) from exc
