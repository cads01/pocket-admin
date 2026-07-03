'use client'

type SkeletonType = 'stats' | 'table' | 'card' | 'text' | 'list' | 'page' | 'profile'

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-surface-hover ${className || ''}`}
    >
      <div className="absolute inset-0 shimmer-sweep" />
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <Shimmer className="h-3 w-20 mb-3" />
      <Shimmer className="h-8 w-16 mb-2" />
      <Shimmer className="h-3 w-24" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="bg-card border border-card-border rounded-xl p-6">
      <Shimmer className="h-4 w-32 mb-6" />
      <div className="space-y-4">
        <div className="flex gap-4 pb-3 border-b border-row-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <Shimmer key={i} className="h-3 flex-1" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex gap-4 py-2">
            {[1, 2, 3, 4, 5].map((cell) => (
              <Shimmer key={cell} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-card border border-card-border rounded-xl">
          <Shimmer className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Shimmer className="h-3 w-1/3" />
            <Shimmer className="h-2.5 w-1/2" />
          </div>
          <Shimmer className="h-6 w-14 rounded-full" />
        </div>
      ))}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="animate-fade-in space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-7 w-48" />
          <Shimmer className="h-4 w-72" />
        </div>
        <Shimmer className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton />
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-4">
        <Shimmer className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Shimmer className="h-5 w-40" />
          <Shimmer className="h-3.5 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Shimmer key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Shimmer className="h-48 rounded-xl" />
    </div>
  )
}

export default function LoadingSkeleton({ type, rows }: { type: SkeletonType; rows?: number }) {
  if (type === 'stats') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }
  if (type === 'table') return <TableSkeleton />
  if (type === 'card') return <CardSkeleton />
  if (type === 'text') {
    return (
      <div className="space-y-3">
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-4 w-1/2" />
      </div>
    )
  }
  if (type === 'list') return <ListSkeleton rows={rows} />
  if (type === 'page') return <PageSkeleton />
  if (type === 'profile') return <ProfileSkeleton />
  return null
}
