'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from './SupabaseProvider'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface CleanerLocation {
  cleaner_id: string
  latitude: number
  longitude: number
  updated_at: string
}

export default function CleanerMap() {
  const { supabase } = useSupabase()
  const [locations, setLocations] = useState<CleanerLocation[]>([])
  const [cleaners, setCleaners] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!supabase) return
    load()

    const channel = supabase
      .channel('cleaner-locations')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cleaner_locations' },
        (payload: RealtimePostgresChangesPayload<CleanerLocation>) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const r = payload.new as CleanerLocation
            setLocations((prev) => {
              const filtered = prev.filter((l) => l.cleaner_id !== r.cleaner_id)
              return [...filtered, r]
            })
          }
          if (payload.eventType === 'DELETE') {
            const r = payload.old as CleanerLocation
            setLocations((prev) => prev.filter((l) => l.cleaner_id !== r.cleaner_id))
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [supabase])

  async function load() {
    if (!supabase) return
    const { data: locs } = await supabase.from('cleaner_locations').select('*')
    if (locs) setLocations(locs)

    const { data: cls } = await supabase.from('cleaners').select('id, profile_id')
    if (cls) {
      const ids = cls.map((c) => c.profile_id)
      const { data: profs } = await supabase.from('profiles').select('id, name').in('id', ids)
      const map: Record<string, string> = {}
      for (const c of cls) {
        const p = profs?.find((pr) => pr.id === c.profile_id)
        map[c.id] = p?.name || c.id.slice(0, 8)
      }
      setCleaners(map)
    }
  }

  if (locations.length === 0) return null

  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 mt-6">
      <h3 className="font-semibold mb-3">Live Cleaner Locations</h3>
      <div className="space-y-2">
        {locations.map((loc) => (
          <div key={loc.cleaner_id} className="flex items-center gap-3 text-sm">
            <span className="w-2 h-2 rounded-full bg-[#00d28e] animate-pulse" />
            <span className="text-[#888]">{cleaners[loc.cleaner_id] || loc.cleaner_id.slice(0, 8)}</span>
            <span className="text-[#555] text-xs">
              {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
            </span>
            <span className="text-[#555] text-xs ml-auto">
              {new Date(loc.updated_at).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
