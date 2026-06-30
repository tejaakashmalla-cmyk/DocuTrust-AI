"""
app/schemas/chat_schema.py
---------------------------
Pydantic schemas for the /chat endpoint.

The answer field is intentionally Optional — it will be populated once
the Ollama/LLM integration is added. Currently the endpoint returns only
retrieved chunks.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Incoming chat question from the client."""

    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The user's natural-language question.",
        examples=["What are the key findings in the Q3 report?"],
    )
    top_k: Optional[int] = Field(
        default=None,
        ge=1,
        le=20,
        description="Override the default number of chunks to retrieve (1–20).",
    )
    document_ids: Optional[list[str]] = Field(
        default=None,
        description="Optional list of document UUIDs to restrict retrieval scope.",
    )


class CitationChunk(BaseModel):
    """A single retrieved chunk with its provenance metadata."""

    chunk_id: str = Field(..., description="Unique chunk identifier in the vector store.")
    document_id: str = Field(..., description="Source document UUID.")
    filename: str = Field(..., description="Source filename.")
    page_number: Optional[int] = Field(default=None, description="Source page number (1-indexed).")
    chunk_number: int = Field(..., description="Chunk index within the document.")
    text: str = Field(..., description="The raw chunk text.")
    relevance_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Cosine similarity score (0 = least relevant, 1 = most relevant).",
    )


class ChatResponse(BaseModel):
    """Response returned by the /chat endpoint."""

    question: str = Field(..., description="The original question echoed back.")
    answer: Optional[str] = Field(
        default=None,
        description="LLM-generated answer. Null until Ollama integration is enabled.",
    )
    citations: list[CitationChunk] = Field(
        ...,
        description="Retrieved chunks used as context, ordered by relevance.",
    )
    total_chunks_retrieved: int = Field(
        ...,
        description="Number of chunks returned by the retriever.",
    )
    model_used: Optional[str] = Field(
        default=None,
        description="LLM model identifier once integrated.",
    )
    note: Optional[str] = Field(
        default="LLM integration pending — returning raw retrieved chunks.",
        description="Informational note about the current response mode.",
    )
