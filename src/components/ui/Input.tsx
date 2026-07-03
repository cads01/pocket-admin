'use client'

export default function Input({
  label,
  error,
  icon: Icon,
  className = '',
  ...props
}: {
  label?: string
  error?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-xs font-medium text-[#aaa] block">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        )}
        <input
          {...props}
          className={`w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-input-focus transition-colors placeholder:text-muted-foreground disabled:opacity-50 ${
            Icon ? 'pl-9' : ''
          } ${error ? 'border-danger' : ''} ${className}`}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
