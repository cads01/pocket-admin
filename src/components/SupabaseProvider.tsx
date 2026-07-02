'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import type { User, SupabaseClient } from '@supabase/supabase-js'

type SupabaseContext = {
  supabase: SupabaseClient | null
  user: User | null
  loading: boolean
}

const Context = createContext<SupabaseContext | undefined>(undefined)

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || !url.startsWith('http')) return null
  return createBrowserClient(url, key)
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef<SupabaseClient | null>(null)

  if (!supabaseRef.current) {
    supabaseRef.current = getClient()
  }
  const supabase = supabaseRef.current

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      router.refresh()
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Context.Provider value={{ supabase, user, loading }}>
      {children}
    </Context.Provider>
  )
}

export function useSupabase() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useSupabase must be inside SupabaseProvider')
  return ctx
}
