"""
app/services/answer_service.py
--------------------------------
Answer generation service for DocuTrust AI using Ollama.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

import httpx

from app.core.config import settings
from app.core.logger import get_logger
from app.services.retrieval_service import RetrievedChunk

logger = get_logger(__name__)


# ============================================================
# Response model
# ============================================================

@dataclass
class AnswerResult:
    answer: Optional[str]
    model_used: Optional[str]
    note: Optional[str]


# ============================================================
# Strategy interface
# ============================================================

class AnswerStrategy(ABC):

    @abstractmethod
    async def generate(
        self,
        question: str,
        chunks: list[RetrievedChunk],
    ) -> AnswerResult:
        pass


# ============================================================
# Stub strategy
# ============================================================

class StubAnswerStrategy(AnswerStrategy):

    async def generate(
        self,
        question: str,
        chunks: list[RetrievedChunk],
    ) -> AnswerResult:

        return AnswerResult(
            answer=None,
            model_used=None,
            note="LLM disabled.",
        )


# ============================================================
# Ollama strategy
# ============================================================

class OllamaAnswerStrategy(AnswerStrategy):

    SYSTEM_PROMPT = """
You are DocuTrust AI.

Answer ONLY using the supplied context.

If the answer does not exist in the context,
say:

"I could not find that information in the uploaded documents."

Keep answers concise.
"""

    def _build_context(
        self,
        chunks: list[RetrievedChunk],
    ) -> str:

        if not chunks:
            return "No context."

        context = []

        for i, chunk in enumerate(chunks, start=1):

            context.append(
                f"""
SOURCE {i}

Filename: {chunk.filename}
Page: {chunk.page_number}

{chunk.text}
"""
            )

        return "\n\n----------------------\n\n".join(context)

    async def generate(
        self,
        question: str,
        chunks: list[RetrievedChunk],
    ) -> AnswerResult:

        context = self._build_context(chunks)

        payload = {
            "model": settings.ollama_model,
            "messages": [
                {
                    "role": "system",
                    "content": self.SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content":
                        f"""
Context:

{context}

Question:

{question}

Answer:
""",
                },
            ],
            "stream": False,
        }

        try:

            async with httpx.AsyncClient(timeout=120) as client:

                response = await client.post(
                    f"{settings.ollama_base_url}/api/chat",
                    json=payload,
                )

                print("=" * 80)
                print("OLLAMA STATUS:", response.status_code)
                print(response.text)
                print("=" * 80)

                response.raise_for_status()

                data = response.json()

                answer = (
                    data.get("message", {})
                    .get("content", "")
                    .strip()
                )

                logger.info(
                    "Ollama answer generated",
                    extra={
                        "model": settings.ollama_model,
                    },
                )

                return AnswerResult(
                    answer=answer,
                    model_used=settings.ollama_model,
                    note=None,
                )

        except Exception as exc:

            logger.error(
                f"Ollama error: {exc}"
            )

            print("=" * 80)
            print("OLLAMA ERROR")
            print(exc)
            print("=" * 80)

            return AnswerResult(
                answer=None,
                model_used=None,
                note=str(exc),
            )


# ============================================================
# Service
# ============================================================

class AnswerService:

    def __init__(
        self,
        strategy: Optional[AnswerStrategy] = None,
    ):

        self._strategy = strategy or OllamaAnswerStrategy()

    def set_strategy(
        self,
        strategy: AnswerStrategy,
    ):

        self._strategy = strategy

    async def generate(
        self,
        question: str,
        chunks: list[RetrievedChunk],
    ) -> AnswerResult:

        return await self._strategy.generate(
            question,
            chunks,
        )


# ============================================================
# Singleton
# ============================================================

answer_service = AnswerService()