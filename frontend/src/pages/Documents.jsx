import React, { useState, useEffect, useCallback } from 'react'
import { Upload, RefreshCw, Search, FileText } from 'lucide-react'
import { listDocuments } from '../services/api'
import DocumentsTable from '../components/documents/DocumentsTable'
import UploadDropzone from '../components/documents/UploadDropzone'
import { Spinner } from '../components/ui'

export default function Documents() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [total, setTotal] = useState(0)

  const fetchDocuments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await listDocuments(0, 200)
      setDocuments(data.documents || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  function handleDelete(id) {
    setDocuments(prev => prev.filter(d => d.document_id !== id))
    setTotal(prev => prev - 1)
  }

  function handleUploadSuccess() {
    setShowUpload(false)
    setTimeout(() => fetchDocuments(true), 800)
  }

  const filtered = documents.filter(d =>
    !searchQuery || d.filename.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search documents…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-8 w-64"
            />
          </div>
          {total > 0 && (
            <span className="text-slate-500 text-sm">
              {filtered.length} of {total} document{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDocuments(true)}
            disabled={refreshing}
            className="btn-ghost"
          >
            {refreshing ? <Spinner size={14} /> : <RefreshCw size={14} />}
            Refresh
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="btn-primary"
          >
            <Upload size={14} />
            {showUpload ? 'Cancel' : 'Upload document'}
          </button>
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="card animate-slide-up">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <Upload size={14} className="text-trust-400" />
            Upload & index a new document
          </h3>
          <UploadDropzone onUploadSuccess={handleUploadSuccess} />
        </div>
      )}

      {/* Table */}
      <DocumentsTable
        documents={filtered}
        loading={loading}
        onDelete={handleDelete}
      />
    </div>
  )
}
