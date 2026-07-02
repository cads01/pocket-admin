'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import LoadingSkeleton from '@/components/LoadingSkeleton'

export default function SettingsPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    load()
  }, [user, loading])

  async function load() {
    if (!supabase) return
    setPageLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single()
    if (data) {
      setName(data.name || '')
      setPhone(data.phone || '')
    }
    setPageLoading(false)
  }

  async function save() {
    if (!supabase) return
    setSaving(true)
    await supabase.from('profiles').update({ name, phone }).eq('id', user!.id)
    setSaving(false)
  }

  return (
    <div className="p-8 max-w-2xl">
      {pageLoading ? (
        <LoadingSkeleton type="card" />
      ) : (
        <>
          <div className="mb-6">
        <h2 className="text-xl font-bold">Settings</h2>
        <p className="text-sm text-[#888]">Platform configuration</p>
      </div>

      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6 mb-4">
        <h3 className="font-semibold mb-4 text-[#00d28e]">Your Profile</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#aaa] block mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#aaa] block mb-1">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#aaa] block mb-1">Email</label>
            <input
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-[#555] cursor-not-allowed"
            />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg text-sm hover:bg-[#00e89c] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6">
        <h3 className="font-semibold mb-4 text-[#ffd700]">Data</h3>
        <div className="flex gap-3">
          <button
            onClick={() => router.refresh()}
            className="px-4 py-2 bg-[#1a1a1a] text-sm rounded-lg hover:bg-[#2a2a2a] cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  )
}
