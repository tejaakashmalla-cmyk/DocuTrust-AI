import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Trash2, MessageSquare, Sliders, X, FileText, ChevronDown } from 'lucide-react'
import { sendChatMessage, listDocuments } from '../services/api'
import { ChatMessage, TypingIndicator } from '../components/chat/ChatMessage'
import { Spinner, Empty } from '../components/ui'

const SUGGESTED = [
  'What are the key findings in this document?',
  'Summarize the main topics covered',
  'What are the important dates or deadlines mentioned?',
  'List the key recommendations or action items',
]

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [topK, setTopK] = useState(5)
  const [showSettings, setShowSettings] = useState(false)
  const [documents, setDocuments] = useState([])
  const [selectedDocs, setSelectedDocs] = useState([])
  const [showDocFilter, setShowDocFilter] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    listDocuments(0, 100)
      .then(d => setDocuments(d.documents?.filter(doc => doc.status === 'completed') || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(async (text) => {
    const q = (text || input).trim()
    if (!q || loading) return

    setInput('')
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: q }])
    setLoading(true)

    try {
      const data = await sendChatMessage(q, topK, selectedDocs.length ? selectedDocs : null)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.answer || data.note,
        answer: data.answer,
        note: data.note,
        citations: data.citations,
        model_used: data.model_used,
        total_chunks: data.total_chunks_retrieved,
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'error',
        content: `Error: ${err.message}`,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, topK, selectedDocs])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function toggleDoc(id) {
    setSelectedDocs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/60 shrink-0">
        <div className="flex items-center gap-3">
          {/* Doc filter */}
          <div className="relative">
            <button
              onClick={() => setShowDocFilter(!showDocFilter)}
              className={`btn-ghost text-xs ${selectedDocs.length ? 'text-trust-400 border border-trust-500/30' : ''}`}
            >
              <FileText size={13} />
              {selectedDocs.length ? `${selectedDocs.length} doc${selectedDocs.length > 1 ? 's' : ''} selected` : 'All documents'}
              <ChevronDown size={12} />
            </button>
            {showDocFilter && (
              <div className="absolute top-full mt-1 left-0 z-20 glass-strong rounded-xl p-2 w-72 shadow-2xl shadow-black/50 animate-slide-up">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-2 mb-2">Filter by document</p>
                {documents.length === 0 ? (
                  <p className="text-slate-500 text-xs px-2 py-2">No indexed documents</p>
                ) : (
                  <div className="space-y-0.5 max-h-52 overflow-y-auto">
                    {documents.map(doc => (
                      <label key={doc.document_id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-ink-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedDocs.includes(doc.document_id)}
                          onChange={() => toggleDoc(doc.document_id)}
                          className="accent-trust-500"
                        />
                        <span className="text-xs text-slate-300 truncate">{doc.filename}</span>
                      </label>
                    ))}
                  </div>
                )}
                {selectedDocs.length > 0 && (
                  <button onClick={() => setSelectedDocs([])} className="mt-2 w-full text-xs text-slate-500 hover:text-slate-300 py-1.5 border-t border-slate-800/60 transition-colors">
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="btn-ghost text-xs text-slate-500"
            >
              <Trash2 size={13} />
              Clear chat
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`btn-ghost text-xs ${showSettings ? 'text-trust-400' : ''}`}
          >
            <Sliders size={13} />
            Top-{topK}
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="px-6 py-3 border-b border-slate-800/60 glass animate-slide-up">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 font-medium whitespace-nowrap">Results (top-k)</label>
              <input
                type="range"
                min={1}
                max={20}
                value={topK}
                onChange={e => setTopK(Number(e.target.value))}
                className="w-32 accent-trust-500"
              />
              <span className="text-sm font-bold text-white w-6 text-center">{topK}</span>
            </div>
            <p className="text-xs text-slate-500">Higher k = more context, slower retrieval</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
            <div className="w-16 h-16 rounded-2xl glass border border-trust-500/20 flex items-center justify-center">
              <MessageSquare size={26} className="text-trust-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg mb-2">Ask anything about your documents</h3>
              <p className="text-slate-500 text-sm max-w-md">
                DocuTrust retrieves semantically relevant chunks and cites sources for every answer.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
              {SUGGESTED.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-left glass rounded-xl px-4 py-3 text-sm text-slate-300 hover:text-white hover:border-trust-500/30 transition-all duration-200 border border-transparent"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              msg.role === 'error' ? (
                <div key={msg.id} className="glass border border-red-800/40 rounded-xl px-4 py-3 text-red-400 text-sm animate-slide-up">
                  {msg.content}
                </div>
              ) : (
                <ChatMessage key={msg.id} message={msg} />
              )
            ))}
            {loading && <TypingIndicator />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-6 pb-6 pt-3 border-t border-slate-800/60">
        <div className="glass rounded-2xl flex items-end gap-3 px-4 py-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents…"
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm resize-none outline-none leading-relaxed"
            style={{ maxHeight: '120px' }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-trust-500 hover:bg-trust-400 flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? <Spinner size={14} className="text-white" /> : <Send size={15} className="text-white" />}
          </button>
        </div>
        <p className="text-[11px] text-slate-600 mt-2 text-center">
          Enter to send · Shift+Enter for new line
          {selectedDocs.length > 0 && ` · Searching ${selectedDocs.length} selected doc${selectedDocs.length > 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  )
}
