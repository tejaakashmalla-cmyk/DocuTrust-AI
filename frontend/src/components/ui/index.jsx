import React from 'react'
import { cn, getStatusColor, getFileTypeColor } from '../../utils/helpers'
import { FileText, Loader2, InboxIcon } from 'lucide-react'

// ── Badge ────────────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const c = getStatusColor(status)
  return (
    <span className={cn('badge border', c.bg, c.text, c.border)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
      {status}
    </span>
  )
}

export function FileTypeBadge({ type }) {
  const c = getFileTypeColor(type)
  return (
    <span className={cn('badge border uppercase', c.bg, c.text, c.border)}>
      {type}
    </span>
  )
}

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 16, className = '' }) {
  return <Loader2 size={size} className={cn('animate-spin text-trust-400', className)} />
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ icon: Icon = InboxIcon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
      <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-4">
        <Icon size={24} className="text-slate-500" />
      </div>
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      <p className="text-slate-500 text-sm max-w-xs leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ── Skeleton loaders ─────────────────────────────────────────────────────────
export function SkeletonRow({ cols = 5 }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-slate-800/40">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className={cn('shimmer rounded h-4', i === 0 ? 'w-48' : i === cols - 1 ? 'w-16' : 'w-24')} />
      ))}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="card space-y-3">
      <div className="shimmer rounded h-4 w-24" />
      <div className="shimmer rounded h-8 w-16" />
      <div className="shimmer rounded h-3 w-32" />
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon: Icon, accent = 'blue' }) {
  const accents = {
    blue: 'text-trust-400 bg-trust-500/10 border-trust-500/20',
    teal: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    slate: 'text-slate-400 bg-slate-700/30 border-slate-600/30',
  }
  return (
    <div className="card-hover">
      <div className="flex items-start justify-between mb-3">
        <p className="text-slate-400 text-sm font-medium">{label}</p>
        {Icon && (
          <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center', accents[accent])}>
            <Icon size={15} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

// ── Toast / alert ─────────────────────────────────────────────────────────────
export function Alert({ type = 'info', message, onClose }) {
  const styles = {
    info: 'bg-trust-500/10 border-trust-500/30 text-trust-300',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    error: 'bg-red-500/10 border-red-500/30 text-red-300',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  }
  return (
    <div className={cn('rounded-lg border px-4 py-3 text-sm flex items-start gap-3', styles[type])}>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 shrink-0">✕</button>
      )}
    </div>
  )
}
