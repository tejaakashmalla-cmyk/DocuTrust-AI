import React from 'react'
import { FileText, Bot, User, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { cn, formatBytes, truncate } from '../../utils/helpers'

function CitationCard({ citation, index }) {
  const [expanded, setExpanded] = React.useState(false)
  const score = Math.round(citation.relevance_score * 100)
  const scoreColor = score >= 75 ? 'text-teal-400' : score >= 50 ? 'text-trust-400' : 'text-slate-400'

  return (
    <div className="glass rounded-lg border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-ink-700/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-slate-600 shrink-0">#{index + 1}</span>
          <FileText size={12} className="text-slate-500 shrink-0" />
          <span className="text-xs font-medium text-slate-300 truncate">{citation.filename}</span>
          {citation.page_number && (
            <span className="text-[11px] text-slate-600 shrink-0">p.{citation.page_number}</span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <div className="flex items-center gap-1">
            <div className="w-16 h-1.5 bg-ink-700 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', score >= 75 ? 'bg-teal-500' : score >= 50 ? 'bg-trust-500' : 'bg-slate-600')}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className={cn('text-[11px] font-mono font-bold', scoreColor)}>{score}%</span>
          </div>
          {expanded ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-800/60 pt-2.5 animate-fade-in">
          <p className="text-xs text-slate-400 leading-relaxed font-mono whitespace-pre-wrap">
            {citation.text}
          </p>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-600">
            <span>Chunk #{citation.chunk_number}</span>
            <span>·</span>
            <span className="font-mono">{citation.document_id.slice(0, 8)}…</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function ChatMessage({ message }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end animate-slide-up">
        <div className="max-w-xl">
          <div className="bg-trust-500/20 border border-trust-500/30 rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-white text-sm leading-relaxed">{message.content}</p>
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-trust-500 to-teal-500 flex items-center justify-center shrink-0 mt-0.5">
          <User size={13} className="text-white" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <div className="w-7 h-7 rounded-full glass border border-trust-500/30 flex items-center justify-center shrink-0 mt-0.5">
        <Bot size={13} className="text-trust-400" />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        {/* Answer or retrieval note */}
        {message.answer ? (
          <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="text-white text-sm leading-relaxed">{message.answer}</p>
          </div>
        ) : message.note ? (
          <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={12} className="text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">Retrieval mode</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">{message.note}</p>
            <p className="text-white text-sm mt-2 leading-relaxed">
              Found <strong className="text-teal-400">{message.citations?.length || 0}</strong> relevant chunks from your document corpus. Review the sources below.
            </p>
          </div>
        ) : null}

        {/* Citations */}
        {message.citations?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-0.5">
              {message.citations.length} source{message.citations.length !== 1 ? 's' : ''}
            </p>
            {message.citations.map((cit, i) => (
              <CitationCard key={cit.chunk_id} citation={cit} index={i} />
            ))}
          </div>
        )}

        {message.model_used && (
          <p className="text-[11px] text-slate-600 px-0.5">via {message.model_used}</p>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <div className="w-7 h-7 rounded-full glass border border-trust-500/30 flex items-center justify-center">
        <Bot size={13} className="text-trust-400" />
      </div>
      <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
