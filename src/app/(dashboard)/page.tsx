'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Booking, Cleaner, Customer, Profile } from '@/lib/supabase'
import { fmtDate, fmtTime } from '@/lib/utils'

export default function DashboardPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cleaner, setCleaner] = useState<Cleaner | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])

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
      <div className="flex items-center justify-center h-full">
        <p className="text-[#888]">Loading...</p>
      </div>
    )
  }

  const totalRevenue = bookings
    .filter((b) => b.status === 'completed' || b.status === 'reviewed')
    .reduce((s, b) => s + b.amount, 0)

  const totalFees = bookings
    .filter((b) => b.status === 'completed' || b.status === 'reviewed')
    .reduce((s, b) => s + b.platform_fee, 0)

  const activeCleaners = cleaners.filter((c) => c.status === 'active').length

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayJobs = bookings.filter((b) => b.scheduled_date === todayStr)

  const upcomingJobs = bookings
    .filter((b) => b.scheduled_date >= todayStr && b.status !== 'cancelled')
    .sort(
      (a, b) =>
        a.scheduled_date.localeCompare(b.scheduled_date) ||
        a.scheduled_time.localeCompare(b.scheduled_time)
    )
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
              <div className="text-xs text-[#888] uppercase tracking-wide mb-1">
                Active Cleaners
              </div>
              <div className="text-3xl font-bold text-[#00d28e]">
                {activeCleaners}
              </div>
              <div className="text-xs text-[#555] mt-1">
                {cleaners.length} total on platform
              </div>
            </div>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
              <div className="text-xs text-[#888] uppercase tracking-wide mb-1">
                Total Customers
              </div>
              <div className="text-3xl font-bold text-[#8b5cf6]">
                {customers.length}
              </div>
              <div className="text-xs text-[#555] mt-1">
                {customers.filter((c) => c.total_jobs > 0).length} have booked
              </div>
            </div>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
              <div className="text-xs text-[#888] uppercase tracking-wide mb-1">
                Total Bookings
              </div>
              <div className="text-3xl font-bold text-white">{bookings.length}</div>
              <div className="text-xs text-[#555] mt-1">
                {todayJobs.length} jobs today
              </div>
            </div>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
              <div className="text-xs text-[#888] uppercase tracking-wide mb-1">
                Platform Revenue
              </div>
              <div className="text-3xl font-bold text-[#ffd700]">
                ${totalFees.toFixed(0)}
              </div>
              <div className="text-xs text-[#555] mt-1">
                ${totalRevenue.toFixed(0)} total volume
              </div>
            </div>
          </div>

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
                        <td className="py-3 pr-4">
                          {fmtDate(b.scheduled_date)}
                        </td>
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
