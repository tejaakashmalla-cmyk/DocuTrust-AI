"""
app/routes/logs.py
-------------------
System diagnostics and health-check endpoints.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.core.config import settings
from app.db.mongodb import get_db

router = APIRouter(tags=["System"])


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    app_name: str
    version: str
    environment: str


class StatsResponse(BaseModel):
    total_documents: int
    total_chunks_indexed: int
    mongodb_database: str
    timestamp: datetime


class ConfigResponse(BaseModel):
    app_name: str
    version: str
    environment: str
    max_file_size_mb: int
    allowed_extensions: list[str]


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc),
        app_name=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
    )


@router.get("/logs/stats", response_model=StatsResponse)
async def get_stats(db: AsyncIOMotorDatabase = Depends(get_db)):
    total_documents = await db["documents"].count_documents({})

    return StatsResponse(
        total_documents=total_documents,
        total_chunks_indexed=0,
        mongodb_database=settings.mongodb_db_name,
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/logs/config", response_model=ConfigResponse)
async def get_config():
    return ConfigResponse(
        app_name=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        max_file_size_mb=settings.max_file_size_mb,
        allowed_extensions=list(settings.allowed_extensions_set),
    )