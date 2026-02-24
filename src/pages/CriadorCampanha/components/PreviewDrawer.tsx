import React from 'react'
import { X, Copy, Download, Check, FileJson } from 'lucide-react'

interface PreviewDrawerProps {
  isOpen: boolean
  onClose: () => void
  content: string
  campaignName: string
  onCopy: () => void
  onDownload: () => void
  copied: boolean
}

export function PreviewDrawer({
  isOpen,
  onClose,
  content,
  campaignName,
  onCopy,
  onDownload,
  copied,
}: PreviewDrawerProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex-1 flex flex-col max-w-2xl ml-auto bg-slate-900 shadow-2xl border-l border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <FileJson className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-slate-100">Preview JSON</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2 p-4 border-b border-slate-700/50">
          <button
            onClick={onCopy}
            className="flex-1 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-2 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <button
            onClick={onDownload}
            className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {content ? (
            <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap break-words">
              {content}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <FileJson className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhum JSON gerado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
