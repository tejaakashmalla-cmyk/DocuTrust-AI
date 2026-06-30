"""
app/main.py
-----------
DocuTrust AI — FastAPI application entry point.

Self-Correcting Enterprise RAG Platform for Trusted Document Intelligence.

Startup sequence:
  1. Connect to MongoDB (Motor async client).
  2. Initialise ChromaDB vector store (lazy — initialised on first use).
  3. Register all API routers.
  4. Serve via Uvicorn.

Run:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logger import get_logger
from app.db.mongodb import close_mongo_connection, connect_to_mongo
from app.routes import chat, documents, logs, upload

logger = get_logger(__name__)


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown side-effects."""
    logger.info(
        "DocuTrust AI starting up",
        extra={"version": settings.app_version, "env": settings.app_env},
    )
    await connect_to_mongo()
    yield
    logger.info("DocuTrust AI shutting down")
    await close_mongo_connection()


# ── Application ────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.app_name,
    description=(
        "**DocuTrust AI** is a Self-Correcting Enterprise RAG Platform for "
        "Trusted Document Intelligence.\n\n"
        "## Features\n"
        "- 📄 Upload PDF, DOCX, and TXT documents\n"
        "- 🔍 Semantic retrieval via ChromaDB + Sentence Transformers\n"
        "- 💬 Ask questions over your document corpus\n"
        "- 🔗 Citation-backed answers with page-level provenance\n"
        "- 🦙 Ollama / Llama 3 integration (architecture ready)\n\n"
        "## Getting Started\n"
        "1. Upload a document via `POST /upload`\n"
        "2. List documents via `GET /documents`\n"
        "3. Ask a question via `POST /chat`"
    ),
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ── Middleware ─────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler ───────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unhandled exception",
        extra={"path": request.url.path, "error": str(exc)},
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please check the logs."},
    )


# ── Routers ────────────────────────────────────────────────────────────────────

app.include_router(upload.router,    prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(chat.router,      prefix="/api/v1")
app.include_router(logs.router,      prefix="/api/v1")


# ── Root ───────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Root"], summary="API root")
async def root():
    """Returns a welcome message and links to the API documentation."""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/v1/health",
    }


# ── Dev runner ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
