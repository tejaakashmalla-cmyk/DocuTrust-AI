import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react'
import { uploadDocument } from '../../services/api'
import { formatBytes } from '../../utils/helpers'
import { Spinner, Alert } from '../ui'
import { cn } from '../../utils/helpers'

const ALLOWED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
}

export default function UploadDropzone({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null) // { type: 'success'|'error', message, data }
  const [currentFile, setCurrentFile] = useState(null)

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return

    setCurrentFile(file)
    setResult(null)
    setUploading(true)
    setProgress(0)

    try {
      const data = await uploadDocument(file, setProgress)
      setResult({ type: 'success', message: `"${data.filename}" indexed — ${data.chunk_count} chunks ready`, data })
      onUploadSuccess?.(data)
    } catch (err) {
      setResult({ type: 'error', message: err.message })
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [onUploadSuccess])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ALLOWED_TYPES,
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    disabled: uploading,
  })

  const borderClass = isDragReject
    ? 'border-red-500/60 bg-red-500/5'
    : isDragActive
    ? 'border-trust-400/70 bg-trust-500/8 scale-[1.01]'
    : 'border-slate-700/60 hover:border-trust-500/40 hover:bg-trust-500/4'

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          borderClass,
          uploading ? 'cursor-not-allowed opacity-70' : ''
        )}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="space-y-4">
            <Spinner size={28} className="mx-auto" />
            <div>
              <p className="text-white font-medium text-sm">{currentFile?.name}</p>
              <p className="text-slate-500 text-xs mt-1">{formatBytes(currentFile?.size || 0)}</p>
            </div>
            <div className="max-w-xs mx-auto">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Uploading & indexing…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-trust-500 to-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto transition-all duration-200',
              isDragActive ? 'bg-trust-500/20 scale-110' : 'glass'
            )}>
              <Upload size={22} className={isDragActive ? 'text-trust-400' : 'text-slate-500'} />
            </div>
            <div>
              {isDragReject ? (
                <p className="text-red-400 font-medium text-sm">File type not supported</p>
              ) : isDragActive ? (
                <p className="text-trust-400 font-medium text-sm">Release to upload</p>
              ) : (
                <>
                  <p className="text-white font-medium text-sm">
                    Drop a document here, or <span className="text-trust-400">browse</span>
                  </p>
                  <p className="text-slate-500 text-xs mt-1">PDF, DOCX, TXT · Max 50 MB</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {result && (
        <Alert
          type={result.type === 'success' ? 'success' : 'error'}
          message={result.message}
          onClose={() => setResult(null)}
        />
      )}

      {result?.type === 'success' && result.data && (
        <div className="glass rounded-xl p-4 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={14} className="text-teal-400" />
            <span className="text-sm font-semibold text-white">Upload complete</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="glass rounded-lg p-2">
              <div className="text-lg font-bold text-white">{result.data.page_count ?? '—'}</div>
              <div className="text-[11px] text-slate-500">Pages</div>
            </div>
            <div className="glass rounded-lg p-2">
              <div className="text-lg font-bold text-teal-400">{result.data.chunk_count}</div>
              <div className="text-[11px] text-slate-500">Chunks</div>
            </div>
            <div className="glass rounded-lg p-2">
              <div className="text-lg font-bold text-white uppercase">{result.data.file_type}</div>
              <div className="text-[11px] text-slate-500">Type</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
