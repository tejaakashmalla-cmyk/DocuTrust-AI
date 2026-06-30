"""
app/services/citation_service.py
----------------------------------
Transforms raw ``RetrievedChunk`` objects into ``CitationChunk`` response
schema objects, and provides deduplication and ranking utilities.
"""

from __future__ import annotations

from app.core.logger import get_logger
from app.schemas.chat_schema import CitationChunk
from app.services.retrieval_service import RetrievedChunk

logger = get_logger(__name__)


class CitationService:
    """Converts retriever output into serialisable citation objects."""

    def build_citations(self, chunks: list[RetrievedChunk]) -> list[CitationChunk]:
        """
        Convert a list of :class:`RetrievedChunk` objects to
        :class:`CitationChunk` schema objects.

        The list is already sorted by relevance (highest first) coming from
        the retriever. We preserve that order.

        Parameters
        ----------
        chunks:
            Output of ``RetrievalService.retrieve``.

        Returns
        -------
        list[CitationChunk]
            Citation objects ready for JSON serialisation.
        """
        citations: list[CitationChunk] = []

        for chunk in chunks:
            citation = CitationChunk(
                chunk_id=chunk.chunk_id,
                document_id=chunk.document_id,
                filename=chunk.filename,
                page_number=chunk.page_number,
                chunk_number=chunk.chunk_number,
                text=chunk.text,
                relevance_score=chunk.relevance_score,
            )
            citations.append(citation)

        logger.debug(
            "Citations built",
            extra={
                "count": len(citations),
                "top_score": citations[0].relevance_score if citations else None,
            },
        )
        return citations

    def deduplicate(self, citations: list[CitationChunk]) -> list[CitationChunk]:
        """
        Remove citations with identical chunk text, keeping the one with
        the highest relevance score.

        Useful when the same passage is indexed multiple times or when
        overlapping chunks produce near-duplicate results.

        Parameters
        ----------
        citations:
            Pre-built citation list.

        Returns
        -------
        list[CitationChunk]
            Deduplicated list, still sorted by relevance_score descending.
        """
        seen_texts: dict[str, CitationChunk] = {}
        for c in citations:
            normalised = c.text.strip().lower()
            existing = seen_texts.get(normalised)
            if existing is None or c.relevance_score > existing.relevance_score:
                seen_texts[normalised] = c

        deduped = sorted(seen_texts.values(), key=lambda x: x.relevance_score, reverse=True)
        removed = len(citations) - len(deduped)
        if removed:
            logger.debug("Citations deduplicated", extra={"removed": removed})
        return deduped

    def filter_by_threshold(
        self,
        citations: list[CitationChunk],
        min_score: float = 0.0,
    ) -> list[CitationChunk]:
        """
        Drop citations below *min_score* relevance.

        Parameters
        ----------
        citations:
            Pre-built citation list.
        min_score:
            Minimum cosine similarity (0–1). Default 0 returns all.

        Returns
        -------
        list[CitationChunk]
            Filtered list.
        """
        if min_score <= 0.0:
            return citations
        filtered = [c for c in citations if c.relevance_score >= min_score]
        logger.debug(
            "Citations filtered by threshold",
            extra={"threshold": min_score, "kept": len(filtered), "total": len(citations)},
        )
        return filtered


# Module-level singleton
citation_service = CitationService()
