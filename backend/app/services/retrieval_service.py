"""
Retrieval service for DocuTrust AI.
Retrieves the most relevant chunks from ChromaDB.
"""

from dataclasses import dataclass
from typing import Optional

from app.core.config import settings
from app.services.embedding_service import embedding_service
from app.services.vector_store_service import vector_store_service


@dataclass
class RetrievedChunk:
    chunk_id: str
    document_id: str
    filename: str
    page_number: int | None
    chunk_number: int
    text: str
    relevance_score: float


class RetrievalService:

    def retrieve(
        self,
        query: str,
        top_k: Optional[int] = None,
        document_ids: Optional[list[str]] = None,
    ) -> list[RetrievedChunk]:

        if top_k is None:
            top_k = settings.top_k_results

        # Temporary embedding
        query_embedding = embedding_service.embed_query(query)

        where = None
        if document_ids:
            if len(document_ids) == 1:
                where = {"document_id": document_ids[0]}

        results = vector_store_service.query(
            query_embedding=query_embedding,
            top_k=top_k,
            where=where,
        )

        retrieved = []

        ids = results.get("ids", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        docs = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for i in range(len(ids)):
            meta = metas[i]

            retrieved.append(
                RetrievedChunk(
                    chunk_id=ids[i],
                    document_id=meta.get("document_id", ""),
                    filename=meta.get("filename", ""),
                    page_number=meta.get("page_number"),
                    chunk_number=meta.get("chunk_number", 0),
                    text=docs[i],
                    relevance_score=1 - distances[i],
                )
            )

        return retrieved


retrieval_service = RetrievalService()