import { clsx } from 'clsx'

export function cn(...classes) {
  return clsx(classes)
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDate(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateShort(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function timeAgo(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDateShort(dateString)
}

export function getFileTypeColor(type) {
  switch (type?.toLowerCase()) {
    case 'pdf': return { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-800/40' }
    case 'docx': return { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-800/40' }
    case 'txt': return { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-800/40' }
    default: return { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' }
  }
}

export function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'completed': return { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-800/40', dot: 'bg-emerald-400' }
    case 'processing': return { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-800/40', dot: 'bg-blue-400' }
    case 'pending': return { bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-800/40', dot: 'bg-amber-400' }
    case 'failed': return { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-800/40', dot: 'bg-red-400' }
    default: return { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700', dot: 'bg-slate-400' }
  }
}

export function truncate(str, maxLen = 60) {
  if (!str || str.length <= maxLen) return str
  return str.slice(0, maxLen) + '…'
}
