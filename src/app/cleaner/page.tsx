'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { fmtDate, fmtTime } from '@/lib/utils'
import { CalendarDays, Clock, MapPin, DollarSign } from 'lucide-react'

const statusLabels: Record<string, string> = {
  assigned: 'Upcoming',
  in_progress: 'Checked In',
  completed: 'Completed',
  reviewed: 'Reviewed',
}

export default function CleanerDashboard() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [bookings, setBookings] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    load()
  }, [user, loading])

  async function load() {
    if (!supabase) return
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single()
    setProfile(p)

    const employee = await supabase
      .from('employees')
      .select('id')
      .eq('profile_id', user!.id)
      .maybeSingle()

    if (employee.data) {
      const { data: b } = await supabase
        .from('bookings')
        .select('*')
        .eq('employee_id', employee.data.id)
        .order('scheduled_date', { ascending: true })
      if (b) setBookings(b)
    }
  }

  async function updateStatus(id: string, status: string) {
    if (!supabase) return
    await supabase.from('bookings').update({ status }).eq('id', id)
    await load()
  }

  const upcoming = bookings.filter((b) => b.status === 'assigned' || b.status === 'in_progress')
  const history = bookings.filter((b) => b.status === 'completed' || b.status === 'reviewed')

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]"><div className="animate-spin w-6 h-6 border-2 border-[#00d28e] border-t-transparent rounded-full" /></div>

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 bg-[#0a0a0a] border-b border-[#1a1a1a] px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="text-lg font-bold">Hey, {profile?.name || 'Cleaner'}</h1>
            <p className="text-xs text-[#888]">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="w-9 h-9 bg-[#1a1a1a] rounded-full flex items-center justify-center text-sm font-bold text-[#00d28e]">
            {profile?.name?.charAt(0) || user?.email?.charAt(0) || 'C'}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {upcoming.length === 0 && history.length === 0 && (
          <div className="text-center py-20 text-[#555]">
            <div className="text-4xl mb-3 opacity-30">🧹</div>
            <p className="text-sm">No bookings yet</p>
          </div>
        )}

        {upcoming.map((b) => (
          <div key={b.id} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#00d28e] uppercase tracking-wide">{statusLabels[b.status]}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.status === 'in_progress' ? 'bg-[rgba(0,210,142,0.12)] text-[#00d28e]' : 'bg-[rgba(255,215,0,0.12)] text-[#ffd700]'}`}>
                ${b.amount}
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-[#888]" />
                <span>{fmtDate(b.scheduled_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#888]" />
                <span>{fmtTime(b.scheduled_date)} {b.duration}h</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[#888]" />
                <span className="text-[#aaa]">{b.address || 'Address TBD'}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-[#888]" />
                <span className="text-[#00d28e]">Your cut: ${(b.amount * 0.85).toFixed(0)}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {b.status === 'assigned' && (
                <button onClick={() => updateStatus(b.id, 'in_progress')} className="flex-1 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg text-sm cursor-pointer">
                  Check In
                </button>
              )}
              {b.status === 'in_progress' && (
                <button onClick={() => updateStatus(b.id, 'completed')} className="flex-1 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg text-sm cursor-pointer">
                  Complete Job
                </button>
              )}
            </div>
          </div>
        ))}

        {history.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wide mt-6 mb-3">History</h2>
            {history.map((b) => (
              <div key={b.id} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 mb-2 opacity-60">
                <div className="flex items-center justify-between text-sm">
                  <span>{fmtDate(b.scheduled_date)}</span>
                  <span className="text-[#00d28e]">${b.amount}</span>
                </div>
                <div className="text-xs text-[#555] mt-1">Completed</div>
              </div>
            ))}
          </>
        )}
      </main>

      <nav className="fixed bottom-0 w-full max-w-lg mx-auto left-1/2 -translate-x-1/2 bg-[#0a0a0a] border-t border-[#1a1a1a] flex justify-around py-2">
        <button className="flex flex-col items-center gap-0.5 text-[#00d28e] cursor-pointer">
          <span className="text-lg">📋</span>
          <span className="text-[10px] font-semibold">Jobs</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-[#555] cursor-pointer">
          <span className="text-lg">💵</span>
          <span className="text-[10px] font-semibold">Earnings</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-[#555] cursor-pointer">
          <span className="text-lg">👤</span>
          <span className="text-[10px] font-semibold">Profile</span>
        </button>
      </nav>
    </div>
  )
}
