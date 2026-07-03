'use client'

const variantMap: Record<string, string> = {
  accent: 'bg-accent-dim text-accent',
  warning: 'bg-warning-dim text-warning',
  danger: 'bg-danger-dim text-danger',
  info: 'bg-[rgba(0,150,214,0.12)] text-info',
  purple: 'bg-purple-dim text-purple',
  ghost: 'bg-surface-hover text-muted',
}

export default function Badge({
  children,
  variant = 'accent',
  className = '',
}: {
  children: React.ReactNode
  variant?: string
  className?: string
}) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${variantMap[variant] || variantMap.accent} ${className}`}>
      {children}
    </span>
  )
}
