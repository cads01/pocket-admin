'use client'

import LoadingSkeleton from '@/components/LoadingSkeleton'

type Column<T> = {
  key: string
  label: string
  width?: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
}

export default function Table<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  loading = false,
  emptyState,
}: {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyState?: React.ReactNode
}) {
  if (loading) {
    return <LoadingSkeleton type="table" />
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted text-xs uppercase tracking-wide border-b border-card-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left py-3 px-4 font-medium ${col.width ? `w-[${col.width}]` : ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-row-border row-hover ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4">
                  {col.render ? col.render(row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
