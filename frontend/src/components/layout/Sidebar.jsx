import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FileText, MessageSquare, LayoutDashboard, Settings,
  Database, BookOpen, Shield, Zap
} from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: FileText, label: 'Documents', path: '/documents' },
  { icon: MessageSquare, label: 'Chat', path: '/chat' },
  { icon: Database, label: 'Analytics', path: '/analytics' },
  { icon: BookOpen, label: 'Logs', path: '/logs' },
  { icon: Settings, label: 'Settings', path: '/settings' },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside className="w-60 h-screen flex flex-col border-r border-slate-800/60 bg-ink-900/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-trust-500 to-teal-500 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-teal-400 border-2 border-ink-900" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-none">DocuTrust</div>
            <div className="text-trust-400 text-[10px] font-medium mt-0.5 tracking-wide">AI PLATFORM</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="section-title mt-1">Navigation</p>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={active ? 'nav-item-active w-full text-left' : 'nav-item w-full text-left'}
            >
              <Icon size={16} className={active ? 'text-trust-400' : ''} />
              <span>{item.label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-trust-400" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-slate-800/60 pt-3">
        <div className="glass rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={13} className="text-trust-400" />
            <span className="text-xs font-semibold text-white">RAG Pipeline</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Self-correcting retrieval with semantic chunk scoring active
          </p>
        </div>
        <div className="mt-3 px-3 py-1.5 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-[11px] text-slate-500">System healthy</span>
        </div>
      </div>
    </aside>
  )
}
