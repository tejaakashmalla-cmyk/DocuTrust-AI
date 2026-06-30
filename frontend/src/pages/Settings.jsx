import React, { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Zap, Database, FileText, Server, RefreshCw } from 'lucide-react'
import { getConfig } from '../services/api'
import { Spinner } from '../components/ui'

function SettingRow({ label, value, desc, mono = false }) {
  return (
    <div className="flex items-start justify-between py-3.5 border-b border-slate-800/40 last:border-0 gap-4">
      <div className="flex-1">
        <p className="text-white text-sm font-medium">{label}</p>
        {desc && <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>}
      </div>
      <div className={`glass rounded-lg px-3 py-1.5 text-sm font-medium shrink-0 ${mono ? 'font-mono' : ''} text-white`}>
        {value ?? '—'}
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, color = 'text-trust-400', children }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800/60">
        <Icon size={14} className={color} />
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load(silent = false) {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const c = await getConfig()
      setConfig(c)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Spinner size={24} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">Runtime configuration loaded from the backend. Edit via environment variables or .env file.</p>
        <button onClick={() => load(true)} disabled={refreshing} className="btn-ghost text-xs">
          {refreshing ? <Spinner size={13} /> : <RefreshCw size={13} />}
          Refresh
        </button>
      </div>

      {config ? (
        <>
          <Section icon={SettingsIcon} title="Application" color="text-trust-400">
            <SettingRow label="App name" value={config.app_name} />
            <SettingRow label="Version" value={config.version} mono />
            <SettingRow label="Environment" value={config.environment} mono />
          </Section>

          <Section icon={FileText} title="File Uploads" color="text-amber-400">
            <SettingRow
              label="Max file size"
              value={`${config.max_file_size_mb} MB`}
              desc="Maximum size for a single uploaded document"
            />
            <SettingRow
              label="Allowed types"
              value={config.allowed_extensions?.join(', ').toUpperCase()}
              desc="Supported document formats"
              mono
            />
          </Section>

          <Section icon={Database} title="Chunking" color="text-teal-400">
            <SettingRow
              label="Chunk size"
              value={`${config.chunk_size} tokens`}
              desc="Target token length for each semantic chunk"
            />
            <SettingRow
              label="Chunk overlap"
              value={`${config.chunk_overlap} tokens`}
              desc="Overlap between consecutive chunks for context continuity"
            />
          </Section>

          <Section icon={Zap} title="Embeddings & Retrieval" color="text-trust-400">
            <SettingRow
              label="Embedding model"
              value={config.embedding_model}
              desc="Sentence Transformer model used to vectorize text"
              mono
            />
            <SettingRow
              label="Default top-k"
              value={String(config.top_k_results)}
              desc="Number of chunks retrieved per query by default"
            />
          </Section>

          <Section icon={Server} title="LLM Integration (Ollama)" color="text-slate-400">
            <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
              <p className="text-xs text-amber-400">
                Ollama integration is configured but not yet active. Update <code className="font-mono">answer_service.py</code> to enable LLM answer synthesis.
              </p>
            </div>
            <SettingRow
              label="Base URL"
              value={config.ollama_base_url}
              desc="Ollama server endpoint"
              mono
            />
            <SettingRow
              label="Model"
              value={config.ollama_model}
              desc="LLM model to use for answer generation"
              mono
            />
          </Section>
        </>
      ) : (
        <div className="card text-center py-12">
          <p className="text-slate-500 text-sm">Could not load configuration from backend.</p>
          <p className="text-slate-600 text-xs mt-1">Ensure the FastAPI server is running on port 8000.</p>
        </div>
      )}
    </div>
  )
}
