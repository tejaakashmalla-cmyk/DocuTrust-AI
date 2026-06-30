import React, { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, Database, Server, Clock } from 'lucide-react'
import { getStats, getHealth } from '../services/api'
import { Spinner } from '../components/ui'
import { formatDate } from '../utils/helpers'

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800/40 last:border-0">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className={`text-sm font-medium text-white ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}

export default function Logs() {
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(null)

  async function load(silent = false) {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [s, h] = await Promise.all([
        getStats().catch(() => null),
        getHealth().catch(() => null),
      ])
      setStats(s)
      setHealth(h)
      setLastRefreshed(new Date())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const isHealthy = health?.status === 'healthy'

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">
      {/* Health banner */}
      <div className={`rounded-xl border p-5 flex items-center justify-between ${
        isHealthy
          ? 'bg-emerald-900/10 border-emerald-800/30'
          : 'bg-red-900/10 border-red-800/30'
      }`}>
        <div className="flex items-center gap-3">
          {loading ? (
            <Spinner size={18} />
          ) : isHealthy ? (
            <CheckCircle size={18} className="text-emerald-400" />
          ) : (
            <AlertCircle size={18} className="text-red-400" />
          )}
          <div>
            <p className={`font-semibold text-sm ${isHealthy ? 'text-emerald-400' : 'text-red-400'}`}>
              {loading ? 'Checking…' : isHealthy ? 'All systems operational' : 'Service unavailable'}
            </p>
            {health && (
              <p className="text-slate-500 text-xs mt-0.5">
                {health.app_name} v{health.version} · {health.environment}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-slate-600 flex items-center gap-1.5">
              <Clock size={11} />
              {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="btn-ghost text-xs"
          >
            {refreshing ? <Spinner size={13} /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vector store stats */}
        <div className="card space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <Database size={14} className="text-teal-400" />
            <h3 className="text-white font-semibold text-sm">Vector Store</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between py-2">
                  <div className="shimmer h-3 w-32 rounded" />
                  <div className="shimmer h-3 w-24 rounded" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <>
              <InfoRow label="Collection" value={stats.chroma_collection} mono />
              <InfoRow label="Total chunks indexed" value={stats.total_chunks_indexed?.toLocaleString()} />
              <InfoRow label="Embedding model" value={stats.embedding_model} mono />
              <InfoRow label="As of" value={formatDate(stats.timestamp)} />
            </>
          ) : (
            <p className="text-slate-500 text-sm">Could not connect to backend</p>
          )}
        </div>

        {/* MongoDB stats */}
        <div className="card space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <Server size={14} className="text-trust-400" />
            <h3 className="text-white font-semibold text-sm">Document Store</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between py-2">
                  <div className="shimmer h-3 w-32 rounded" />
                  <div className="shimmer h-3 w-24 rounded" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <>
              <InfoRow label="MongoDB database" value={stats.mongodb_database} mono />
              <InfoRow label="Total documents" value={stats.total_documents?.toLocaleString()} />
              <InfoRow label="API version" value={health?.version ?? '—'} mono />
              <InfoRow label="Environment" value={health?.environment ?? '—'} />
            </>
          ) : (
            <p className="text-slate-500 text-sm">Could not connect to backend</p>
          )}
        </div>
      </div>

      {/* API endpoints reference */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Server size={14} className="text-slate-400" />
          <h3 className="text-white font-semibold text-sm">API Endpoints</h3>
        </div>
        <div className="space-y-2">
          {[
            { method: 'POST', path: '/api/v1/upload', desc: 'Upload and index a document' },
            { method: 'GET', path: '/api/v1/documents', desc: 'List all documents (paginated)' },
            { method: 'GET', path: '/api/v1/documents/:id', desc: 'Get document details' },
            { method: 'DELETE', path: '/api/v1/documents/:id', desc: 'Delete document and vectors' },
            { method: 'POST', path: '/api/v1/chat', desc: 'Ask a question (RAG retrieval)' },
            { method: 'GET', path: '/api/v1/health', desc: 'System health check' },
            { method: 'GET', path: '/api/v1/logs/stats', desc: 'Vector store & doc statistics' },
            { method: 'GET', path: '/api/v1/logs/config', desc: 'Runtime configuration' },
          ].map((ep) => (
            <div key={ep.path} className="flex items-center gap-3 py-2.5 border-b border-slate-800/30 last:border-0">
              <span className={`font-mono text-xs font-bold w-14 shrink-0 ${
                ep.method === 'GET' ? 'text-teal-400' :
                ep.method === 'POST' ? 'text-trust-400' :
                'text-red-400'
              }`}>{ep.method}</span>
              <span className="font-mono text-xs text-slate-300 w-56 shrink-0">{ep.path}</span>
              <span className="text-xs text-slate-500">{ep.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600">
          Full interactive docs available at{' '}
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="text-trust-400 hover:underline font-mono">
            localhost:8000/docs
          </a>
        </p>
      </div>
    </div>
  )
}
