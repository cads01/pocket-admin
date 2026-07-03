'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function RouteLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const prevPath = useRef(pathname)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
      startLoad()
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [pathname, searchParams])

  function startLoad() {
    setLoading(true)
    setProgress(0)

    let p = 0
    const steps = [
      { at: 100, to: 25 },
      { at: 200, to: 45 },
      { at: 400, to: 65 },
      { at: 700, to: 80 },
      { at: 1200, to: 90 },
    ]
    let stepIdx = 0
    const start = Date.now()

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      while (stepIdx < steps.length && elapsed >= steps[stepIdx].at) {
        p = steps[stepIdx].to
        stepIdx++
      }
      setProgress(p)
    }, 50)

    setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current)
      setProgress(100)
      setTimeout(() => setLoading(false), 200)
    }, 2000)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[2px]">
      {loading && (
        <div
          className="h-full bg-accent transition-all duration-300 ease-out animate-progress"
          style={{ width: `${progress}%` }}
        />
      )}
    </div>
  )
}
