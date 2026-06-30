import React, { useState, useEffect } from 'react'
import { BarChart2, Database, FileText, Layers, Zap, TrendingUp, Clock } from 'lucide-react'
import { getStats, listDocuments } from '../services/api'
import { StatCard, StatCardSkeleton, FileTypeBadge, StatusBadge } from '../components/ui'
import { formatBytes, formatDate } from '../utils/helpers'

function ProgressBar({ value, max, color = 'bg-trust-500' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-ink-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, docs] = await Promise.all([
          getStats().catch(() => null),
          listDocuments(0, 200).catch(() => ({ documents: [] }))
        ])
        setStats(s)
        setDocuments(docs.documents || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Compute breakdowns
  const byType = documents.reduce((acc, d) => {
    acc[d.file_type] = (acc[d.file_type] || 0) + 1
    return acc
  }, {})

  const byStatus = documents.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1
    return acc
  }, {})

  const totalPages = documents.reduce((s, d) => s + (d.page_count || 0), 0)
  const totalSize = documents.reduce((s, d) => s + (d.file_size_bytes || 0), 0)
  const avgChunks = documents.length > 0
    ? Math.round(documents.reduce((s, d) => s + (d.chunk_count || 0), 0) / documents.length)
    : 0

  const topByChunks = [...documents]
    .filter(d => d.chunk_count)
    .sort((a, b) => b.chunk_count - a.chunk_count)
    .slice(0, 5)

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
          <>
            <StatCard label="Total Documents" value={stats?.total_documents ?? 0} sub="in corpus" icon={FileText} accent="blue" />
            <StatCard label="Total Chunks" value={(stats?.total_chunks_indexed ?? 0).toLocaleString()} sub="vector entries" icon={Layers} accent="teal" />
            <StatCard label="Total Pages" value={totalPages.toLocaleString()} sub="across all docs" icon={BarChart2} accent="amber" />
            <StatCard label="Storage Used" value={formatBytes(totalSize)} sub="raw document size" icon={Database} accent="slate" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File type breakdown */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-trust-400" />
            <h3 className="text-white font-semibold text-sm">By File Type</h3>
          </div>
          {Object.keys(byType).length === 0 ? (
            <p className="text-slate-500 text-sm">No documents yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byType).map(([type, count]) => (
                <div key={type}>
                  <div className="flex justify-between mb-1.5">
                    <FileTypeBadge type={type} />
                    <span className="text-sm font-semibold text-white">{count}</span>
                  </div>
                  <ProgressBar
                    value={count}
                    max={documents.length}
                    color={type === 'pdf' ? 'bg-red-500' : type === 'docx' ? 'bg-blue-500' : 'bg-green-500'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-teal-400" />
            <h3 className="text-white font-semibold text-sm">Processing Status</h3>
          </div>
          {Object.keys(byStatus).length === 0 ? (
            <p className="text-slate-500 text-sm">No documents yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status}>
                  <div className="flex justify-between mb-1.5">
                    <StatusBadge status={status} />
                    <span className="text-sm font-semibold text-white">{count}</span>
                  </div>
                  <ProgressBar
                    value={count}
                    max={documents.length}
                    color={status === 'completed' ? 'bg-emerald-500' : status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Averages */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-amber-400" />
            <h3 className="text-white font-semibold text-sm">Averages</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Avg chunks / doc', value: avgChunks.toLocaleString() },
              { label: 'Avg pages / doc', value: documents.length > 0 ? Math.round(totalPages / documents.length) : '—' },
              { label: 'Avg size / doc', value: documents.length > 0 ? formatBytes(totalSize / documents.length) : '—' },
              { label: 'Embedding model', value: stats?.embedding_model?.split('/').pop() ?? '—' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-800/40 last:border-0">
                <span className="text-slate-400 text-xs">{item.label}</span>
                <span className="text-white text-sm font-semibold font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top documents by chunks */}
      {topByChunks.length > 0 && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-teal-400" />
            <h3 className="text-white font-semibold text-sm">Most-Indexed Documents</h3>
            <span className="text-xs text-slate-500">(by chunk count)</span>
          </div>
          <div className="space-y-2.5">
            {topByChunks.map((doc, i) => (
              <div key={doc.document_id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-mono text-slate-600 w-4">#{i + 1}</span>
                    <FileText size={12} className="text-slate-500 shrink-0" />
                    <span className="text-sm text-white truncate">{doc.filename}</span>
                    <FileTypeBadge type={doc.file_type} />
                  </div>
                  <span className="text-sm font-bold text-teal-400 ml-4 shrink-0">{doc.chunk_count} ch</span>
                </div>
                <ProgressBar
                  value={doc.chunk_count}
                  max={topByChunks[0].chunk_count}
                  color="bg-gradient-to-r from-trust-500 to-teal-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
