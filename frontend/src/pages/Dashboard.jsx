import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Database, MessageSquare, Zap, Upload, ArrowRight, TrendingUp, Clock } from 'lucide-react'
import { getStats, getHealth, listDocuments } from '../services/api'
import { StatCard, StatCardSkeleton, StatusBadge, FileTypeBadge } from '../components/ui'
import UploadDropzone from '../components/documents/UploadDropzone'
import { timeAgo, formatBytes } from '../utils/helpers'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [recentDocs, setRecentDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [s, h, docs] = await Promise.all([
          getStats().catch(() => null),
          getHealth().catch(() => null),
          listDocuments(0, 5).catch(() => ({ documents: [] })),
        ])
        setStats(s)
        setHealth(h)
        setRecentDocs(docs.documents || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [refreshKey])

  function handleUploadSuccess() {
    setTimeout(() => setRefreshKey(k => k + 1), 800)
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">
      {/* Hero */}
      <div className="glass rounded-2xl p-6 glow-blue relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-trust-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-semibold text-teal-400 tracking-widest uppercase">
              {health?.status === 'healthy' ? 'All systems operational' : 'Connecting…'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to <span className="text-gradient-blue">DocuTrust AI</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
            Self-correcting enterprise RAG for trusted document intelligence. Upload documents, build your knowledge base, and query it with natural language.
          </p>
          <div className="flex gap-3 mt-5">
            <button onClick={() => navigate('/chat')} className="btn-primary">
              <MessageSquare size={14} />
              Start asking
              <ArrowRight size={13} />
            </button>
            <button onClick={() => navigate('/documents')} className="btn-ghost">
              <FileText size={14} />
              View documents
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Documents"
              value={stats?.total_documents ?? 0}
              sub="in your knowledge base"
              icon={FileText}
              accent="blue"
            />
            <StatCard
              label="Indexed Chunks"
              value={stats?.total_chunks_indexed?.toLocaleString() ?? 0}
              sub="semantic vector entries"
              icon={Database}
              accent="teal"
            />
            <StatCard
              label="Embedding Model"
              value={stats?.embedding_model?.split('-').slice(-1)[0] ?? '—'}
              sub={stats?.embedding_model}
              icon={Zap}
              accent="amber"
            />
            <StatCard
              label="Collection"
              value={stats?.chroma_collection ?? '—'}
              sub={`${stats?.mongodb_database ?? '—'} database`}
              icon={Database}
              accent="slate"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload panel */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <Upload size={15} className="text-trust-400" />
            <h3 className="text-white font-semibold text-sm">Quick Upload</h3>
          </div>
          <UploadDropzone onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* Recent documents */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-slate-400" />
              <h3 className="text-white font-semibold text-sm">Recent Documents</h3>
            </div>
            <button onClick={() => navigate('/documents')} className="text-trust-400 text-xs hover:text-trust-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={11} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="shimmer w-7 h-7 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <div className="shimmer h-3 rounded w-40" />
                    <div className="shimmer h-2 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentDocs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-slate-500 text-sm">No documents yet. Upload one to get started.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentDocs.map((doc) => (
                <div key={doc.document_id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-ink-800/60 transition-colors">
                  <div className="w-7 h-7 rounded-lg glass flex items-center justify-center shrink-0">
                    <FileText size={13} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{doc.filename}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <FileTypeBadge type={doc.file_type} />
                      <span className="text-[11px] text-slate-600">{timeAgo(doc.uploaded_at)}</span>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RAG pipeline info */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-trust-400" />
          <h3 className="text-white font-semibold text-sm">RAG Pipeline Architecture</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { step: '1', label: 'Upload', desc: 'PDF · DOCX · TXT' },
            { step: '2', label: 'Parse', desc: 'Extract text & structure' },
            { step: '3', label: 'Chunk', desc: `${stats?.chunk_size || 512} token windows` },
            { step: '4', label: 'Embed', desc: 'Sentence Transformers' },
            { step: '5', label: 'Retrieve', desc: 'ChromaDB semantic search' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-trust-500/15 border border-trust-500/30 flex items-center justify-center text-trust-400 text-xs font-bold">
                  {s.step}
                </div>
                <div className="text-center mt-2">
                  <div className="text-white text-xs font-semibold">{s.label}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">{s.desc}</div>
                </div>
              </div>
              {i < 4 && <div className="w-3 h-px bg-slate-700 hidden md:block mt-[-24px]" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
