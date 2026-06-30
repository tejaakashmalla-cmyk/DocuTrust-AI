import React from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Bell, HelpCircle } from 'lucide-react'

const pageTitles = {
  '/': { title: 'Dashboard', sub: 'Overview of your document intelligence platform' },
  '/documents': { title: 'Documents', sub: 'Manage your indexed document library' },
  '/chat': { title: 'Ask Questions', sub: 'Query your documents with natural language' },
  '/analytics': { title: 'Analytics', sub: 'Document processing insights and metrics' },
  '/logs': { title: 'System Logs', sub: 'Retrieval pipeline activity and diagnostics' },
  '/settings': { title: 'Settings', sub: 'Configure AI and retrieval parameters' },
}

export default function Header() {
  const location = useLocation()
  const page = pageTitles[location.pathname] || pageTitles['/']

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-slate-800/60 bg-ink-900/40 backdrop-blur-sm">
      <div>
        <h1 className="text-white font-semibold text-sm">{page.title}</h1>
        <p className="text-slate-500 text-xs mt-0.5 hidden sm:block">{page.sub}</p>
      </div>

      <div className="flex items-center gap-1">
        <button className="btn-ghost p-2 rounded-lg">
          <HelpCircle size={16} />
        </button>
        <button className="btn-ghost p-2 rounded-lg relative">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-trust-400" />
        </button>
        <div className="ml-2 w-7 h-7 rounded-full bg-gradient-to-br from-trust-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
          DT
        </div>
      </div>
    </header>
  )
}
