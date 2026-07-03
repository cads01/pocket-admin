'use client'

import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const variantMap: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-[#0a0a0a] font-semibold hover:bg-accent-hover btn-shine',
  secondary: 'bg-surface-hover text-muted hover:text-white hover:bg-[#2a2a2a]',
  ghost: 'bg-transparent text-muted hover:text-white hover:bg-surface-hover',
  danger: 'bg-danger-dim text-danger hover:bg-[rgba(255,80,80,0.2)]',
}

const sizeMap: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-sm rounded-xl',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  onClick,
  type = 'button',
  className = '',
}: {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  icon?: React.ComponentType<{ size?: number }>
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn-press inline-flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantMap[variant]} ${sizeMap[size]} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon && <Icon size={14} />}
      {children}
    </button>
  )
}
