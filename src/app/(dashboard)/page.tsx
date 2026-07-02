'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Booking, Cleaner, Customer, Profile } from '@/lib/supabase'
import { fmtDate, fmtTime } from '@/lib/utils'
import CleanerMap from '@/components/CleanerMap'
import LoadingSkeleton from '@/components/LoadingSkeleton'

export default function DashboardPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cleaner, setCleaner] = useState<Cleaner | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [waitlist, setWaitlist] = useState<any[]>([])
  const [managedClients, setManagedClients] = useState<any[]>([])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }

    loadData()
  }, [user, loading])

  async function loadData() {
    if (!supabase) return
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single()
    if (p) setProfile(p)

    if (p?.role === 'admin') {
      const { data: b } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (b) setBookings(b)

      const { data: cl } = await supabase.from('cleaners').select('*')
      if (cl) setCleaners(cl)

      const { data: cu } = await supabase.from('customers').select('*')
      if (cu) setCustomers(cu)

      const { data: w } = await supabase.from('waitlist_signups').select('*').order('signed_up_at', { ascending: false })
      if (w) setWaitlist(w)

      const { data: mc } = await supabase.from('managed_clients').select('*').order('since', { ascending: false })
      if (mc) setManagedClients(mc)
    } else if (p?.role === 'cleaner') {
      const { data: c } = await supabase
        .from('cleaners')
        .select('*')
        .eq('profile_id', user!.id)
        .single()
      if (c) {
        setCleaner(c)
        const { data: b } = await supabase
          .from('bookings')
          .select('*')
          .eq('cleaner_id', c.id)
          .order('scheduled_date', { ascending: true })
        if (b) setBookings(b)
      }
    }
  }

  if (loading || !profile) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <LoadingSkeleton type="text" />
          </div>
        </div>
        <LoadingSkeleton type="stats" />
        <LoadingSkeleton type="table" />
      </div>
    )
  }

  const totalRevenue = bookings
    .filter((b) => b.status === 'completed' || b.status === 'reviewed')
    .reduce((s, b) => s + b.amount, 0)

  const totalFees = bookings
    .filter((b) => b.status === 'completed' || b.status === 'reviewed')
    .reduce((s, b) => s + b.platform_fee, 0)

  const activeCleaners = cleaners.filter((c) => c.active).length

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayJobs = bookings.filter((b) => b.scheduled_date === todayStr)

  const upcomingJobs = bookings
    .filter((b) => b.scheduled_date >= todayStr && b.status !== 'cancelled')
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    .slice(0, 8)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold">
            Welcome back, {profile.name || 'User'}
          </h2>
          <p className="text-sm text-[#888]">
            {profile.role === 'admin'
              ? 'Platform overview'
              : profile.role === 'cleaner'
              ? 'Your upcoming jobs'
              : 'Your bookings'}
          </p>
        </div>
      </div>

      {profile.role === 'admin' && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
              <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Waitlist Signups</div>
              <div className="text-3xl font-bold text-[#00d28e]">{waitlist.length}</div>
              <div className="text-xs text-[#555] mt-1">{waitlist.filter(w => w.team_size === 1).length} solo operators</div>
            </div>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
              <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Active Clients</div>
              <div className="text-3xl font-bold text-white">{managedClients.filter(c => c.status === 'active').length}</div>
              <div className="text-xs text-[#555] mt-1">{managedClients.filter(c => c.status === 'trial').length} in trial · {managedClients.filter(c => c.status === 'churned').length} churned</div>
            </div>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
              <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Monthly Revenue</div>
              <div className="text-3xl font-bold text-[#ffd700]">${managedClients.reduce((s, c) => s + (c.mrr || 0), 0).toFixed(0)}</div>
              <div className="text-xs text-[#555] mt-1">{managedClients.filter(c => c.status === 'active').length} paying clients</div>
            </div>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
              <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Conversion Rate</div>
              <div className="text-3xl font-bold text-[#8b5cf6]">{waitlist.length ? Math.round((managedClients.length / (waitlist.length + managedClients.length)) * 100) : 0}%</div>
              <div className="text-xs text-[#555] mt-1">{managedClients.length} converted · {waitlist.length} in pipeline</div>
            </div>
          </div>

          {/* Waitlist */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden mb-6">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <h3 className="font-semibold">Waitlist Signups</h3>
              <button className="px-3 py-1.5 bg-[#1a1a1a] text-xs rounded-lg hover:bg-[#2a2a2a] cursor-pointer">📥 Export CSV</button>
            </div>
            {waitlist.length === 0 ? (
              <div className="text-center py-12 text-[#555]">
                <div className="text-4xl mb-3 opacity-30">📋</div>
                <p className="text-sm">No signups yet — post in Facebook groups and they'll appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#888] text-xs uppercase tracking-wide">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Business</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Phone</th>
                      <th className="text-left py-3 px-4">Team</th>
                      <th className="text-left py-3 px-4">Pain Point</th>
                      <th className="text-left py-3 px-4">Signed Up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlist.map(w => (
                      <tr key={w.id} className="border-b border-[#151515] hover:bg-[#0f0f0f]">
                        <td className="py-3 px-4 font-medium">{w.name}</td>
                        <td className="py-3 px-4 text-[#888]">{w.business || '—'}</td>
                        <td className="py-3 px-4 text-[#888]">{w.email || '—'}</td>
                        <td className="py-3 px-4 text-[#888]">{w.phone || '—'}</td>
                        <td className="py-3 px-4">{w.team_size}</td>
                        <td className="py-3 px-4 text-[#ffd700] text-xs">{w.pain_point || '—'}</td>
                        <td className="py-3 px-4 text-[#555] text-xs">{fmtDate(w.signed_up_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Managed Clients */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden mb-6">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <h3 className="font-semibold">Client Management</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-[#00d28e] text-[#0a0a0a] text-xs rounded-lg font-semibold cursor-pointer">➕ Add Client</button>
                <button className="px-3 py-1.5 bg-[#1a1a1a] text-xs rounded-lg hover:bg-[#2a2a2a] cursor-pointer">📥 Export CSV</button>
              </div>
            </div>
            {managedClients.length === 0 ? (
              <div className="text-center py-12 text-[#555]">
                <div className="text-4xl mb-3 opacity-30">🧑‍🤝‍🧑</div>
                <p className="text-sm">No clients yet — convert your first waitlist signup.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#888] text-xs uppercase tracking-wide">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Phone</th>
                      <th className="text-left py-3 px-4">Schedule</th>
                      <th className="text-left py-3 px-4">Price/Job</th>
                      <th className="text-left py-3 px-4">Since</th>
                      <th className="text-left py-3 px-4">MRR</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managedClients.map(c => (
                      <tr key={c.id} className="border-b border-[#151515] hover:bg-[#0f0f0f]">
                        <td className="py-3 px-4 font-medium">{c.name}</td>
                        <td className="py-3 px-4 text-[#888]">{c.phone || '—'}</td>
                        <td className="py-3 px-4 text-[#888] text-xs">{c.schedule || '—'}</td>
                        <td className="py-3 px-4">${(c.price_per_job || 0).toFixed(0)}</td>
                        <td className="py-3 px-4 text-[#555] text-xs">{fmtDate(c.since)}</td>
                        <td className="py-3 px-4 text-[#ffd700]">${(c.mrr || 0).toFixed(0)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            c.status === 'active' ? 'bg-[rgba(0,210,142,0.12)] text-[#00d28e]'
                            : c.status === 'trial' ? 'bg-[rgba(255,215,0,0.12)] text-[#ffd700]'
                            : 'bg-[rgba(255,80,80,0.12)] text-[#ff5050]'
                          }`}>{c.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <CleanerMap />

          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6">
            <h3 className="font-semibold mb-4">Recent Bookings</h3>
            {upcomingJobs.length === 0 ? (
              <p className="text-[#555] text-sm">No upcoming bookings</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#888] text-xs uppercase tracking-wide">
                      <th className="text-left py-3 pr-4">Customer</th>
                      <th className="text-left py-3 pr-4">Cleaner</th>
                      <th className="text-left py-3 pr-4">Date</th>
                      <th className="text-left py-3 pr-4">Amount</th>
                      <th className="text-left py-3 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingJobs.map((b) => (
                      <tr key={b.id} className="border-t border-[#151515]">
                        <td className="py-3 pr-4 font-medium">{b.id.slice(0, 8)}</td>
                        <td className="py-3 pr-4 text-[#888]">
                          {b.cleaner_id.slice(0, 8)}
                        </td>
                        <td className="py-3 pr-4">{fmtDate(b.scheduled_date)}</td>
                        <td className="py-3 pr-4">${b.amount.toFixed(0)}</td>
                        <td className="py-3 pr-4">
                          <span className={`status-${b.status} inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold`}>
                            {b.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {profile.role === 'cleaner' && cleaner && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
            <div className="text-xs text-[#888] uppercase tracking-wide mb-1">
              Today's Jobs
            </div>
            <div className="text-3xl font-bold text-[#00d28e]">{todayJobs.length}</div>
          </div>
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
            <div className="text-xs text-[#888] uppercase tracking-wide mb-1">
              Total Earnings
            </div>
            <div className="text-3xl font-bold text-[#ffd700]">
              ${cleaner.total_earnings.toFixed(0)}
            </div>
          </div>
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
            <div className="text-xs text-[#888] uppercase tracking-wide mb-1">
              Rating
            </div>
            <div className="text-3xl font-bold text-[#8b5cf6]">
              {cleaner.rating.toFixed(1)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
