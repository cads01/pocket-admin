'use client'

import { useState } from 'react'

type Position = 'top' | 'bottom' | 'left' | 'right'

const positionMap: Record<Position, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

export default function Tooltip({
  content,
  children,
  position = 'top',
}: {
  content: string
  children: React.ReactNode
  position?: Position
}) {
  const [show, setShow] = useState(false)

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={`absolute z-50 ${positionMap[position]} whitespace-nowrap px-2.5 py-1.5 text-xs bg-surface-elevated border border-card-border rounded-lg shadow-elevated text-muted animate-fade-in pointer-events-none`}
        >
          {content}
        </div>
      )}
    </div>
  )
}
