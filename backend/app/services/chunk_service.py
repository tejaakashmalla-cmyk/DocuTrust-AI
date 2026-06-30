"""
app/services/chunk_service.py
Simple text chunking without LangChain.
"""

from dataclasses import dataclass, field

from app.core.config import settings
from app.services.parser_service import PageText


@dataclass
class TextChunk:
    document_id: str
    filename: str
    page_number: int
    chunk_number: int
    text: str
    char_start: int = 0
    metadata: dict = field(default_factory=dict)

    @property
    def chunk_id(self):
        return f"{self.document_id}_{self.chunk_number}"


class ChunkService:
    def __init__(self):
        self.chunk_size = settings.chunk_size
        self.chunk_overlap = settings.chunk_overlap

    def split_text(self, text: str):
        chunks = []

        start = 0
        while start < len(text):
            end = start + self.chunk_size
            chunks.append(text[start:end])

            start += self.chunk_size - self.chunk_overlap
            if start < 0:
                start = end

        return chunks

    def chunk_pages(
        self,
        pages: list[PageText],
        document_id: str,
        filename: str,
    ):
        all_chunks = []
        chunk_no = 0

        for page in pages:
            if not page.text.strip():
                continue

            pieces = self.split_text(page.text)

            for piece in pieces:
                all_chunks.append(
                    TextChunk(
                        document_id=document_id,
                        filename=filename,
                        page_number=page.page_number,
                        chunk_number=chunk_no,
                        text=piece,
                        metadata={
                            "document_id": document_id,
                            "filename": filename,
                            "page_number": page.page_number,
                            "chunk_number": chunk_no,
                        },
                    )
                )
                chunk_no += 1

        return all_chunks

    def chunk_text(
        self,
        text: str,
        document_id: str,
        filename: str,
        page_number: int = 1,
    ):
        page = PageText(page_number=page_number, text=text)
        return self.chunk_pages([page], document_id, filename)


chunk_service = ChunkService()