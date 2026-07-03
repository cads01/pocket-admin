'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function RouteLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const prevPath = useRef(pathname)
  const [loading, setLoading] = useState(false)
  const doneRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
      setLoading(true)
      if (doneRef.current) clearTimeout(doneRef.current)
      doneRef.current = setTimeout(() => setLoading(false), 400)
    }
    return () => {
      if (doneRef.current) clearTimeout(doneRef.current)
    }
  }, [pathname, searchParams])

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[2px]">
      {loading && (
        <div className="h-full bg-accent transition-all duration-500 ease-out animate-progress" />
      )}
    </div>
  )
}
