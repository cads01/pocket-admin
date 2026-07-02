'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Cleaner } from '@/lib/supabase'
import CleanerMap from '@/components/CleanerMap'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import LoadingSkeleton from '@/components/LoadingSkeleton'

interface CleanerLocation {
  cleaner_id: string
  latitude: number
  longitude: number
  updated_at: string
}

export default function CleanersPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [cleaners, setCleaners] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [locations, setLocations] = useState<Map<string, CleanerLocation>>(new Map())
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return
    loadLocations()

    const channel = supabase
      .channel('cleaner-locations-page')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cleaner_locations' },
        (payload: RealtimePostgresChangesPayload<CleanerLocation>) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const r = payload.new as CleanerLocation
            setLocations((prev) => {
              const next = new Map(prev)
              next.set(r.cleaner_id, r)
              return next
            })
          }
          if (payload.eventType === 'DELETE') {
            const r = payload.old as CleanerLocation
            setLocations((prev) => {
              const next = new Map(prev)
              next.delete(r.cleaner_id)
              return next
            })
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [supabase])

  async function loadLocations() {
    if (!supabase) return
    const { data: locs } = await supabase.from('cleaner_locations').select('*')
    if (locs) {
      const map = new Map<string, CleanerLocation>()
      for (const loc of locs) map.set(loc.cleaner_id, loc)
      setLocations(map)
    }
  }

  const [form, setForm] = useState({
    name: '',
    business: '',
    phone: '',
    email: '',
    bio: '',
    services: 'standard',
    active: true,
    verified: false,
  })

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    loadCleaners()
  }, [user, loading])

  async function loadCleaners() {
    if (!supabase) return
    setPageLoading(true)
    const { data } = await supabase.from('cleaners').select('*, profiles!inner(name, email, phone)')
    if (data) setCleaners(data)
    setPageLoading(false)
  }

  function openAdd() {
    setEditId(null)
    setForm({ name: '', business: '', phone: '', email: '', bio: '', services: 'standard', active: true, verified: false })
    setShowModal(true)
  }

  function openEdit(c: any) {
    setEditId(c.id)
    setForm({
      name: c.profiles?.name || '',
      business: c.business || '',
      phone: c.profiles?.phone || '',
      email: c.profiles?.email || '',
      bio: c.bio || '',
      services: c.services?.[0] || 'standard',
      active: c.active,
      verified: c.verified,
    })
    setShowModal(true)
  }

  async function save() {
    if (!supabase) return
    if (!form.name) return
    if (editId) {
      await supabase.from('cleaners').update({
        business: form.business,
        bio: form.bio,
        services: [form.services],
        active: form.active,
        verified: form.verified,
      }).eq('id', editId)
    }
    await loadCleaners()
    setShowModal(false)
  }

  async function toggleActive(id: string, current: boolean) {
    if (!supabase) return
    await supabase.from('cleaners').update({ active: !current }).eq('id', id)
    await loadCleaners()
  }

  async function toggleVerify(id: string, current: boolean) {
    if (!supabase) return
    await supabase.from('cleaners').update({ verified: !current }).eq('id', id)
    await loadCleaners()
  }

  const active = cleaners.filter((c) => c.active).length
  const verified = cleaners.filter((c) => c.verified).length

  return (
    <div className="p-8">
      {pageLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton type="stats" />
          <LoadingSkeleton type="table" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Cleaners</h2>
          <p className="text-sm text-[#888]">Service providers on the platform</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg text-sm hover:bg-[#00e89c] transition-colors cursor-pointer"
        >
          + Add Cleaner
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Total</div>
          <div className="text-2xl font-bold text-[#00d28e]">{cleaners.length}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Active</div>
          <div className="text-2xl font-bold text-white">{active}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Verified</div>
          <div className="text-2xl font-bold text-[#ffd700]">{verified}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Earnings</div>
          <div className="text-2xl font-bold text-white">
            ${cleaners.reduce((s, c) => s + (c.total_earnings || 0), 0).toFixed(0)}
          </div>
        </div>
      </div>

      <CleanerMap />

      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
        {cleaners.length === 0 ? (
          <div className="text-center py-16 text-[#555]">
            <div className="text-4xl mb-3 opacity-30">🧹</div>
            <p>No cleaners yet — add your first one!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#888] text-xs uppercase tracking-wide border-b border-[#1a1a1a]">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Business</th>
                  <th className="text-left py-3 px-4">Phone</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Location</th>
                  <th className="text-left py-3 px-4">Rating</th>
                  <th className="text-left py-3 px-4">Jobs</th>
                  <th className="text-left py-3 px-4">Earnings</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cleaners.map((c: any) => (
                  <tr key={c.id} className="border-b border-[#151515] hover:bg-[#0f0f0f]">
                    <td className="py-3 px-4 font-medium">{c.profiles?.name || '—'}</td>
                    <td className="py-3 px-4 text-[#888]">{c.business || '—'}</td>
                    <td className="py-3 px-4 text-[#888]">{c.profiles?.phone || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`${c.active ? 'text-[#00d28e]' : 'text-[#ff5050]'} inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-${c.active ? '[rgba(0,210,142,0.12)]' : '[rgba(255,80,80,0.12)]'}`}>
                        {c.active ? 'Active' : 'Suspended'}
                        {c.verified && <span className="ml-1 text-[#00d28e]">✓</span>}
                      </span>
                      {!c.verified && (
                        <button onClick={() => toggleVerify(c.id, c.verified)} className="ml-1 text-[#ffd700] text-xs hover:underline cursor-pointer">○</button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const loc = locations.get(c.id)
                        const recent = loc && Date.now() - new Date(loc.updated_at).getTime() < 5 * 60 * 1000
                        return recent ? (
                          <span className="flex items-center gap-1.5" title={`${loc!.latitude.toFixed(4)}, ${loc!.longitude.toFixed(4)}`}>
                            <span className="w-2 h-2 rounded-full bg-[#00d28e] animate-pulse" />
                            <span className="text-[#00d28e] text-xs font-medium">Live</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#555]" />
                            <span className="text-[#555] text-xs">Offline</span>
                          </span>
                        )
                      })()}
                    </td>
                    <td className="py-3 px-4 text-[#ffd700]">{c.rating?.toFixed(1) || '—'}</td>
                    <td className="py-3 px-4">{c.completed_jobs || 0}</td>
                    <td className="py-3 px-4">${(c.total_earnings || 0).toFixed(0)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(c)} className="px-2.5 py-1 bg-[#1a1a1a] text-xs rounded-md hover:bg-[#2a2a2a] cursor-pointer">✏️</button>
                        <button onClick={() => toggleActive(c.id, c.active)} className={`px-2.5 py-1 text-xs rounded-md cursor-pointer ${c.active ? 'bg-[rgba(255,80,80,0.12)] text-[#ff5050]' : 'bg-[#1a1a1a] text-[#888]'}`}>
                          {c.active ? '⛔' : '✅'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-[#141414] border border-[#222] rounded-2xl p-7 w-[480px] max-w-[94vw] max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[#00d28e] mb-5">{editId ? 'Edit' : 'Add'} Cleaner</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[#aaa] block mb-1">Full Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#aaa] block mb-1">Business Name</label>
                <input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#aaa] block mb-1">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#aaa] block mb-1">Email</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#aaa] block mb-1">Bio / Services</label>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e] resize-none h-20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#aaa] block mb-1">Services</label>
                  <select value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]">
                    <option value="standard">Standard Clean</option>
                    <option value="deep">Deep Clean</option>
                    <option value="move">Move-Out/In</option>
                    <option value="all">All Services</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#aaa] block mb-1">Status</label>
                  <select value={form.active ? 'active' : 'suspended'} onChange={(e) => setForm({ ...form, active: e.target.value === 'active' })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]">
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#aaa] cursor-pointer pt-2">
                <input type="checkbox" checked={form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} className="accent-[#00d28e]" />
                Verified (official registration)
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-[#1a1a1a] text-sm rounded-lg hover:bg-[#2a2a2a] cursor-pointer">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold text-sm rounded-lg hover:bg-[#00e89c] cursor-pointer">{editId ? 'Update' : 'Add Cleaner'}</button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}
