'use client'

interface LoadingSkeletonProps {
  type: 'stats' | 'table' | 'card' | 'text'
}

function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#1a1a1a] rounded-lg ${className || ''}`} />
}

export default function LoadingSkeleton({ type }: LoadingSkeletonProps) {
  if (type === 'stats') {
    return (
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
            <Block className="h-3 w-20 mb-3" />
            <Block className="h-8 w-16 mb-2" />
            <Block className="h-3 w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6">
        <Block className="h-4 w-32 mb-6" />
        <div className="space-y-4">
          <div className="flex gap-4 pb-3 border-b border-[#1a1a1a]">
            {[1, 2, 3, 4, 5].map((i) => (
              <Block key={i} className="h-3 flex-1" />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex gap-4 py-2">
              {[1, 2, 3, 4, 5].map((cell) => (
                <Block key={cell} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'card') {
    return (
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
        <Block className="h-4 w-24 mb-4" />
        <Block className="h-10 w-16 mb-2" />
        <Block className="h-3 w-32" />
      </div>
    )
  }

  if (type === 'text') {
    return (
      <div className="space-y-3">
        <Block className="h-4 w-full" />
        <Block className="h-4 w-3/4" />
        <Block className="h-4 w-1/2" />
      </div>
    )
  }

  return null
}
