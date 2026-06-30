# DocuTrust AI — Frontend

React + Vite + Tailwind CSS frontend for the DocuTrust AI Enterprise RAG Platform.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (backend must be running on :8000)
npm run dev

# Build for production
npm run build
```

## Backend connection

The frontend expects the FastAPI backend running at `http://localhost:8000`.

To change this, copy `.env.example` to `.env.local` and set `VITE_API_URL`.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — stats, quick upload, recent documents |
| `/documents` | Full document library with search & delete |
| `/chat` | RAG Q&A with source citations |
| `/analytics` | Charts and breakdowns of the document corpus |
| `/logs` | Health check, system stats, API reference |
| `/settings` | Runtime configuration viewer |

## Tech Stack

- **React 18** + **React Router v6**
- **Vite 5** (build tool)
- **Tailwind CSS 3** (utility-first styling)
- **Lucide React** (icons)
- **Axios** (HTTP client)
- **React Dropzone** (file upload UX)
