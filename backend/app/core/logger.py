"""
app/core/logger.py
------------------
Centralised structured logging for DocuTrust AI.

Supports:
  - JSON format  (production / log-aggregators)
  - Plain format (development)

Usage:
    from app.core.logger import get_logger
    logger = get_logger(__name__)
    logger.info("Document ingested", extra={"doc_id": "abc123"})
"""

import json
import logging
import sys
from datetime import datetime, timezone

from app.core.config import settings


class _JsonFormatter(logging.Formatter):
    """Emit log records as single-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno,
        }
        # Merge any extra keys the caller supplied
        for key, value in record.__dict__.items():
            if key not in {
                "args", "asctime", "created", "exc_info", "exc_text",
                "filename", "funcName", "id", "levelname", "levelno",
                "lineno", "message", "module", "msecs", "msg", "name",
                "pathname", "process", "processName", "relativeCreated",
                "stack_info", "thread", "threadName",
            }:
                payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


class _PlainFormatter(logging.Formatter):
    """Human-readable coloured formatter for development consoles."""

    _COLORS = {
        "DEBUG":    "\033[36m",   # cyan
        "INFO":     "\033[32m",   # green
        "WARNING":  "\033[33m",   # yellow
        "ERROR":    "\033[31m",   # red
        "CRITICAL": "\033[35m",   # magenta
    }
    _RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self._COLORS.get(record.levelname, "")
        ts = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        base = (
            f"{color}[{ts}] [{record.levelname:<8}] "
            f"{record.name}:{record.lineno} — {record.getMessage()}{self._RESET}"
        )
        if record.exc_info:
            base += f"\n{self.formatException(record.exc_info)}"
        return base


def _build_handler() -> logging.Handler:
    handler = logging.StreamHandler(sys.stdout)
    if settings.log_format.lower() == "json":
        handler.setFormatter(_JsonFormatter())
    else:
        handler.setFormatter(_PlainFormatter())
    return handler


def get_logger(name: str) -> logging.Logger:
    """
    Return (and cache) a named logger configured for DocuTrust AI.

    Parameters
    ----------
    name:
        Typically ``__name__`` of the calling module.
    """
    logger = logging.getLogger(name)

    if not logger.handlers:
        level = getattr(logging, settings.log_level.upper(), logging.INFO)
        logger.setLevel(level)
        logger.addHandler(_build_handler())
        logger.propagate = False

    return logger


# Root logger setup — suppress noisy third-party loggers
logging.getLogger("uvicorn.access").propagate = False
logging.getLogger("chromadb").setLevel(logging.WARNING)
logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
