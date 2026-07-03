'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

type ModalSize = 'sm' | 'md' | 'lg'

const sizeMap: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: ModalSize
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`bg-surface-elevated border border-card-border shadow-modal rounded-2xl p-6 w-full ${sizeMap[size]} max-w-[94vw] max-h-[90vh] overflow-y-auto animate-scale-in`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-accent">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-white hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
