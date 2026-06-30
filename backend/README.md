# DocuTrust AI
### Self-Correcting Enterprise RAG Platform for Trusted Document Intelligence

---

## Overview

DocuTrust AI is a production-grade backend for enterprise document intelligence.  
It ingests PDF, DOCX, and TXT documents, splits them into overlapping semantic chunks, generates dense vector embeddings, stores them in ChromaDB, and answers natural-language questions using citation-backed retrieval.

The architecture is fully wired for Ollama / Llama 3 answer synthesis — activating it requires one line change in `answer_service.py`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI + Uvicorn |
| PDF Parsing | PyMuPDF |
| DOCX Parsing | python-docx |
| Text Splitting | LangChain RecursiveCharacterTextSplitter |
| Embeddings | Sentence Transformers (`all-MiniLM-L6-v2`) |
| Vector Store | ChromaDB (persistent, cosine similarity) |
| Document DB | MongoDB (async via Motor) |
| Config | Pydantic Settings + python-dotenv |
| Logging | Structured JSON / coloured plain-text |
| LLM (future) | Ollama + Llama 3 |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                     ← FastAPI app, lifespan, routers
│   ├── core/
│   │   ├── config.py               ← Centralised Pydantic settings
│   │   └── logger.py               ← JSON / plain structured logger
│   ├── db/
│   │   └── mongodb.py              ← Motor async client + FastAPI dependency
│   ├── models/
│   │   └── document_model.py       ← MongoDB document model
│   ├── schemas/
│   │   ├── upload_schema.py        ← Upload request/response schemas
│   │   ├── document_schema.py      ← Document list/detail/delete schemas
│   │   └── chat_schema.py          ← Chat request/response + citation schema
│   ├── services/
│   │   ├── parser_service.py       ← PDF / DOCX / TXT text extraction
│   │   ├── chunk_service.py        ← Configurable text chunking
│   │   ├── embedding_service.py    ← SentenceTransformer embedding
│   │   ├── vector_store_service.py ← ChromaDB index/delete/query
│   │   ├── retrieval_service.py    ← Semantic top-k retrieval
│   │   ├── answer_service.py       ← Stub + Ollama answer strategies
│   │   ├── citation_service.py     ← RetrievedChunk → CitationChunk
│   │   └── document_service.py     ← MongoDB CRUD for documents
│   ├── routes/
│   │   ├── upload.py               ← POST /upload
│   │   ├── documents.py            ← GET/DELETE /documents
│   │   ├── chat.py                 ← POST /chat
│   │   └── logs.py                 ← GET /health, /logs/stats, /logs/config
│   ├── utils/
│   │   └── file_utils.py           ← Save/delete/validate uploaded files
│   ├── uploads/                    ← Uploaded files (git-ignored)
│   └── vectorstore/                ← ChromaDB persistence (git-ignored)
├── requirements.txt
├── .env.example
└── README.md
```

---

## Quickstart

### 1. Prerequisites

- Python 3.12+
- MongoDB running locally on port 27017  
  ```bash
  mongod --dbpath /data/db
  ```
- (Optional for LLM) Ollama:  
  ```bash
  ollama serve && ollama pull llama3
  ```

### 2. Install dependencies

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env to match your environment
```

Key variables:

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB_NAME` | `docutrust` | Database name |
| `UPLOAD_DIR` | `./app/uploads` | File storage path |
| `CHROMA_PERSIST_DIR` | `./app/vectorstore` | ChromaDB storage path |
| `CHUNK_SIZE` | `512` | Characters per chunk |
| `CHUNK_OVERLAP` | `64` | Overlap between chunks |
| `TOP_K_RESULTS` | `5` | Default retrieval count |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | SentenceTransformers model |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3` | Ollama model identifier |

### 4. Run the server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Or via Python:
```bash
python -m app.main
```

### 5. Explore the API

- Swagger UI: http://localhost:8000/docs  
- ReDoc: http://localhost:8000/redoc  
- Health: http://localhost:8000/api/v1/health

---

## API Reference

### POST `/api/v1/upload`
Upload a document (PDF / DOCX / TXT).

**Request:** `multipart/form-data` with field `file`

**Response:**
```json
{
  "document_id": "uuid",
  "filename": "report.pdf",
  "file_type": "pdf",
  "file_size_bytes": 204800,
  "page_count": 12,
  "chunk_count": 47,
  "status": "completed",
  "uploaded_at": "2024-01-15T10:30:00Z",
  "message": "Document uploaded and indexed successfully."
}
```

---

### GET `/api/v1/documents`
List all uploaded documents (paginated).

**Query params:** `skip`, `limit`

---

### GET `/api/v1/documents/{document_id}`
Get full metadata for a single document.

---

### DELETE `/api/v1/documents/{document_id}`
Delete document from MongoDB, disk, and ChromaDB.

---

### POST `/api/v1/chat`
Ask a question over the document corpus.

**Request:**
```json
{
  "question": "What are the key findings in the Q3 report?",
  "top_k": 5,
  "document_ids": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "question": "What are the key findings in the Q3 report?",
  "answer": null,
  "citations": [
    {
      "chunk_id": "uuid__p3__c12",
      "document_id": "uuid",
      "filename": "q3_report.pdf",
      "page_number": 3,
      "chunk_number": 12,
      "text": "Revenue grew 24% YoY driven by...",
      "relevance_score": 0.9231
    }
  ],
  "total_chunks_retrieved": 5,
  "model_used": null,
  "note": "LLM integration pending — returning raw retrieved chunks."
}
```

---

### GET `/api/v1/health`
Liveness probe.

### GET `/api/v1/logs/stats`
Document count, chunk count, collection info.

### GET `/api/v1/logs/config`
Active runtime configuration.

---

## Enabling Ollama / Llama 3

1. Install and start Ollama: `ollama serve`
2. Pull the model: `ollama pull llama3`
3. In `app/services/answer_service.py`, change:
   ```python
   # answer_service = AnswerService()              ← stub
   answer_service = AnswerService(strategy=OllamaAnswerStrategy())  ← activate
   ```
4. Restart the server.

The `OllamaAnswerStrategy` is fully implemented — it builds a RAG prompt from retrieved chunks, POSTs to Ollama's `/api/chat` endpoint, and returns the generated answer alongside citations.

---

## Architecture Notes

- **Routes** only call services — no business logic in routers.
- **Services** are stateless singletons injected at module level.
- **MongoDB** access uses Motor (fully async) via a FastAPI `Depends` injection.
- **ChromaDB** is lazily initialised on first use and persisted to disk.
- **Embeddings** are computed in batches; the model is loaded once and cached.
- **Chunking** uses LangChain's `RecursiveCharacterTextSplitter` with configurable size/overlap.
- **Logging** is structured (JSON in production, coloured plain-text in development).

---

## License

MIT — DocuTrust AI, 2024
