'use client'

import { AlertTriangle, X } from 'lucide-react'

type ConfirmVariant = 'danger' | 'warning' | 'info'

const variantMap: Record<ConfirmVariant, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  info: 'text-accent',
}

const buttonMap: Record<ConfirmVariant, string> = {
  danger: 'bg-danger-dim text-danger hover:bg-[rgba(255,80,80,0.2)]',
  warning: 'bg-warning-dim text-warning hover:bg-[rgba(255,215,0,0.2)]',
  info: 'bg-accent text-[#0a0a0a] font-semibold hover:bg-accent-hover',
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  variant?: ConfirmVariant
  loading?: boolean
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface-elevated border border-card-border shadow-modal rounded-2xl p-6 w-full max-w-sm max-w-[90vw] animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={22} className={variantMap[variant]} />
            <h3 className="text-base font-bold">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-white hover:bg-surface-hover transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-muted mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg text-muted hover:text-white bg-surface-hover hover:bg-[#2a2a2a] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm rounded-lg font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${buttonMap[variant]}`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
