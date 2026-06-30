import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
})

// ── Request interceptor ─────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
)

// ── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An unexpected error occurred'
    return Promise.reject(new Error(message))
  }
)

// ── Upload API ──────────────────────────────────────────────────────────────
export const uploadDocument = async (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/api/v1/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    },
  })
  return response.data
}

// ── Documents API ───────────────────────────────────────────────────────────
export const listDocuments = async (skip = 0, limit = 100) => {
  const response = await api.get('/api/v1/documents', { params: { skip, limit } })
  return response.data
}

export const getDocument = async (documentId) => {
  const response = await api.get(`/api/v1/documents/${documentId}`)
  return response.data
}

export const deleteDocument = async (documentId) => {
  const response = await api.delete(`/api/v1/documents/${documentId}`)
  return response.data
}

// ── Chat API ────────────────────────────────────────────────────────────────
export const sendChatMessage = async (question, topK = 5, documentIds = null) => {
  const payload = { question, top_k: topK }
  if (documentIds?.length) payload.document_ids = documentIds
  const response = await api.post('/api/v1/chat', payload)
  return response.data
}

// ── System API ──────────────────────────────────────────────────────────────
export const getHealth = async () => {
  const response = await api.get('/api/v1/health')
  return response.data
}

export const getStats = async () => {
  const response = await api.get('/api/v1/logs/stats')
  return response.data
}

export const getConfig = async () => {
  const response = await api.get('/api/v1/logs/config')
  return response.data
}

export default api
