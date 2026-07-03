'use client'

let inputIdCounter = 0

export default function Input({
  label,
  error,
  icon: Icon,
  id,
  className = '',
  ...props
}: {
  label?: string
  error?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  id?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}-${++inputIdCounter}` : undefined)
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground block">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        )}
        <input
          id={inputId}
          {...props}
          className={`w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm text-foreground focus-glow transition-colors placeholder:text-muted-foreground disabled:opacity-50 ${
            Icon ? 'pl-9' : ''
          } ${error ? 'border-danger' : ''} ${className}`}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
