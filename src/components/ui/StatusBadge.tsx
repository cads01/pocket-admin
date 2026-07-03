'use client'

export default function StatusBadge({
  status,
  className = '',
}: {
  status: string
  className?: string
}) {
  return (
    <span className={`status-${status} inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${className}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
