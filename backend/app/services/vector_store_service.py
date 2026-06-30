"""
app/services/vector_store_service.py
--------------------------------------
Manages the ChromaDB persistent vector store.

Responsibilities:
  - Initialise and persist a named Chroma collection.
  - Index ``TextChunk`` objects with their embeddings.
  - Delete chunks by document_id.
  - Expose raw collection access for the retrieval service.

ChromaDB stores vectors on disk at ``settings.chroma_persist_dir``.
"""

from __future__ import annotations

from typing import Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import settings
from app.core.logger import get_logger
from app.services.chunk_service import TextChunk
from app.services.embedding_service import embedding_service

logger = get_logger(__name__)


class VectorStoreService:
    """Singleton wrapper around a single ChromaDB collection."""

    def __init__(self) -> None:
        self._client: chromadb.PersistentClient | None = None
        self._collection = None

    def _ensure_initialised(self) -> None:
        if self._client is None:
            persist_dir = str(settings.chroma_path)
            logger.info("Initialising ChromaDB", extra={"persist_dir": persist_dir})
            self._client = chromadb.PersistentClient(
                path=persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            self._collection = self._client.get_or_create_collection(
                name=settings.chroma_collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(
                "ChromaDB collection ready",
                extra={
                    "collection": settings.chroma_collection_name,
                    "count": self._collection.count(),
                },
            )

    @property
    def collection(self):
        self._ensure_initialised()
        return self._collection

    # ── Indexing ───────────────────────────────────────────────────────────────

    def add_chunks(self, chunks: list[TextChunk]) -> int:
        """
        Embed and upsert a list of :class:`TextChunk` objects.

        Parameters
        ----------
        chunks:
            Chunks produced by ``ChunkService.chunk_pages``.

        Returns
        -------
        int
            Number of chunks indexed.
        """
        if not chunks:
            return 0

        self._ensure_initialised()

        texts = [c.text for c in chunks]
        ids = [c.chunk_id for c in chunks]
        metadatas = [
            {
                "document_id": c.document_id,
                "filename": c.filename,
                "page_number": c.page_number,
                "chunk_number": c.chunk_number,
                "text": c.text,            # stored for retrieval without a separate lookup
            }
            for c in chunks
        ]

        embeddings = embedding_service.embed_batch(texts)

        self._collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
        )

        logger.info(
            "Chunks indexed into ChromaDB",
            extra={
                "count": len(chunks),
                "document_id": chunks[0].document_id if chunks else None,
            },
        )
        return len(chunks)

    # ── Deletion ───────────────────────────────────────────────────────────────

    def delete_by_document_id(self, document_id: str) -> int:
        """
        Remove all chunks belonging to *document_id* from the collection.

        Parameters
        ----------
        document_id:
            UUID of the document whose chunks should be purged.

        Returns
        -------
        int
            Number of vectors deleted.
        """
        self._ensure_initialised()

        # ChromaDB ≥ 0.4 supports where-filter deletion
        results = self._collection.get(
            where={"document_id": document_id},
            include=[],
        )
        ids = results.get("ids", [])
        if ids:
            self._collection.delete(ids=ids)
            logger.info(
                "Chunks deleted from ChromaDB",
                extra={"document_id": document_id, "count": len(ids)},
            )
        else:
            logger.warning(
                "No chunks found for document_id",
                extra={"document_id": document_id},
            )
        return len(ids)

    # ── Query ──────────────────────────────────────────────────────────────────

    def query(
        self,
        query_embedding: list[float],
        top_k: int,
        where: Optional[dict] = None,
    ) -> dict:
        """
        Run a nearest-neighbour query against the collection.

        Parameters
        ----------
        query_embedding:
            Pre-computed query vector (from ``EmbeddingService.embed_query``).
        top_k:
            Maximum number of results to return.
        where:
            Optional ChromaDB metadata filter (e.g. ``{"document_id": "..."}``).

        Returns
        -------
        dict
            Raw ChromaDB result dict containing ``ids``, ``documents``,
            ``metadatas``, and ``distances``.
        """
        self._ensure_initialised()

        kwargs: dict = dict(
            query_embeddings=[query_embedding],
            n_results=min(top_k, self._collection.count() or 1),
            include=["documents", "metadatas", "distances"],
        )
        if where:
            kwargs["where"] = where

        results = self._collection.query(**kwargs)
        return results

    # ── Stats ──────────────────────────────────────────────────────────────────

    def total_chunks(self) -> int:
        """Return the total number of vectors in the collection."""
        self._ensure_initialised()
        return self._collection.count()


# Module-level singleton
vector_store_service = VectorStoreService()
