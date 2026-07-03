'use client'

type CardVariant = 'default' | 'elevated' | 'interactive' | 'glass'
type CardPadding = 'sm' | 'md' | 'lg'

const paddingMap: Record<CardPadding, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

const variantMap: Record<CardVariant, string> = {
  default: 'bg-card border border-card-border shadow-card',
  elevated: 'bg-surface-elevated border border-card-border shadow-elevated',
  interactive: 'bg-card border border-card-border shadow-card card-hover cursor-pointer',
  glass: 'border border-[rgba(255,255,255,0.06)] shadow-card glass bg-[rgba(18,18,18,0.85)]',
}

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  onClick,
}: {
  children: React.ReactNode
  variant?: CardVariant
  padding?: CardPadding
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl ${variantMap[variant]} ${paddingMap[padding]} ${className}`}
    >
      {children}
    </div>
  )
}
