"""
app/db/mongodb.py
-----------------
Async MongoDB client using Motor.

Provides:
  - A lifecycle-managed client (connect on startup, disconnect on shutdown).
  - A ``get_db()`` dependency for use in FastAPI route handlers.
  - A ``get_collection(name)`` helper for service-layer access.
"""

from __future__ import annotations

from typing import AsyncGenerator

import motor.motor_asyncio
from fastapi import Request
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)


class _MongoManager:
    """Singleton that owns the Motor client lifecycle."""

    def __init__(self) -> None:
        self._client: AsyncIOMotorClient | None = None

    async def connect(self) -> None:
        logger.info("Connecting to MongoDB", extra={"uri": settings.mongodb_uri})
        self._client = AsyncIOMotorClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=5_000,
        )
        # Validate the connection immediately
        await self._client.admin.command("ping")
        logger.info("MongoDB connection established", extra={"db": settings.mongodb_db_name})

    async def disconnect(self) -> None:
        if self._client is not None:
            self._client.close()
            logger.info("MongoDB connection closed")

    @property
    def client(self) -> AsyncIOMotorClient:
        if self._client is None:
            raise RuntimeError("MongoDB client is not initialised. Call connect() first.")
        return self._client

    @property
    def db(self) -> AsyncIOMotorDatabase:
        return self.client[settings.mongodb_db_name]


mongo_manager = _MongoManager()


# ── FastAPI lifespan helpers ───────────────────────────────────────────────────

async def connect_to_mongo() -> None:
    """Call during application startup."""
    await mongo_manager.connect()


async def close_mongo_connection() -> None:
    """Call during application shutdown."""
    await mongo_manager.disconnect()


# ── Dependency ─────────────────────────────────────────────────────────────────

async def get_db(request: Request) -> AsyncIOMotorDatabase:
    """
    FastAPI dependency that yields the active database handle.

    Usage
    -----
    ::

        @router.get("/example")
        async def example(db: AsyncIOMotorDatabase = Depends(get_db)):
            ...
    """
    return mongo_manager.db


def get_collection(collection_name: str):
    """
    Direct access helper for service-layer code that doesn't go through
    FastAPI's dependency-injection system.

    Parameters
    ----------
    collection_name:
        Name of the MongoDB collection.
    """
    return mongo_manager.db[collection_name]
