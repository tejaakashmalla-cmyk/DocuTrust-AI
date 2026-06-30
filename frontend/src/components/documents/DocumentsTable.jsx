import React, { useState } from 'react'
import { Trash2, FileText, Eye, ChevronRight } from 'lucide-react'
import { deleteDocument } from '../../services/api'
import { formatBytes, timeAgo } from '../../utils/helpers'
import { StatusBadge, FileTypeBadge, SkeletonRow, Empty } from '../ui'

export default function DocumentsTable({ documents, loading, onDelete, onView }) {
  const [deleting, setDeleting] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  async function handleDelete(id) {
    if (confirmId !== id) {
      setConfirmId(id)
      setTimeout(() => setConfirmId(null), 3000)
      return
    }
    setDeleting(id)
    setConfirmId(null)
    try {
      await deleteDocument(id)
      onDelete?.(id)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-xl overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)}
      </div>
    )
  }

  if (!documents?.length) {
    return (
      <Empty
        icon={FileText}
        title="No documents yet"
        description="Upload your first document to start building your knowledge base"
      />
    )
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[2fr_80px_80px_100px_100px_90px_60px] gap-3 px-4 py-3 border-b border-slate-800/60 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <div>Document</div>
        <div>Type</div>
        <div>Size</div>
        <div>Pages / Chunks</div>
        <div>Status</div>
        <div>Uploaded</div>
        <div></div>
      </div>

      {/* Rows */}
      {documents.map((doc) => (
        <div
          key={doc.document_id}
          className="grid grid-cols-[2fr_80px_80px_100px_100px_90px_60px] gap-3 px-4 py-3.5 border-b border-slate-800/30 hover:bg-ink-800/40 transition-colors duration-150 items-center group"
        >
          {/* Filename */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg glass flex items-center justify-center shrink-0">
              <FileText size={13} className="text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate" title={doc.filename}>
                {doc.filename}
              </p>
              <p className="text-slate-600 text-[11px] font-mono truncate">{doc.document_id.slice(0, 8)}…</p>
            </div>
          </div>

          {/* Type */}
          <div><FileTypeBadge type={doc.file_type} /></div>

          {/* Size */}
          <div className="text-slate-400 text-xs">{formatBytes(doc.file_size_bytes)}</div>

          {/* Pages / Chunks */}
          <div className="text-xs text-slate-400">
            <span className="text-white font-medium">{doc.page_count ?? '—'}</span> pg /&nbsp;
            <span className="text-teal-400 font-medium">{doc.chunk_count ?? '—'}</span> ch
          </div>

          {/* Status */}
          <div><StatusBadge status={doc.status} /></div>

          {/* Time */}
          <div className="text-xs text-slate-500">{timeAgo(doc.uploaded_at)}</div>

          {/* Actions */}
          <div className="flex items-center gap-1 justify-end">
            {onView && (
              <button
                onClick={() => onView(doc)}
                className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-ink-700 transition-colors"
                title="View details"
              >
                <Eye size={13} />
              </button>
            )}
            <button
              onClick={() => handleDelete(doc.document_id)}
              disabled={deleting === doc.document_id}
              className={`p-1.5 rounded-md transition-colors ${
                confirmId === doc.document_id
                  ? 'text-red-400 bg-red-900/30'
                  : 'text-slate-600 hover:text-red-400 hover:bg-red-900/20'
              }`}
              title={confirmId === doc.document_id ? 'Click again to confirm' : 'Delete document'}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
