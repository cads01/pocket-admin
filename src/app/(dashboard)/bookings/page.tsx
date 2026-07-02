'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Booking } from '@/lib/supabase'
import { fmtDate } from '@/lib/utils'

const STATUSES = ['all', 'requested', 'assigned', 'in_progress', 'completed', 'reviewed', 'cancelled'] as const

export default function BookingsPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [showTimeline, setShowTimeline] = useState<string | null>(null)
  const [form, setForm] = useState({
    customer_name: '', cleaner_id: '', service_type: 'standard',
    date: '', time: '', amount: 0, address: '', notes: '',
  })
  const [cleaners, setCleaners] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    loadData()
  }, [user, loading])

  async function loadData() {
    if (!supabase) return
    const { data: b } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
    if (b) setBookings(b)

    const { data: cl } = await supabase.from('cleaners').select('*, profiles(name)')
    if (cl) setCleaners(cl as any)

    const { data: cu } = await supabase.from('customers').select('*, profiles(name)')
    if (cu) setCustomers(cu as any)
  }

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter)

  const requested = bookings.filter((b) => b.status === 'requested').length
  const active = bookings.filter((b) => b.status === 'assigned' || b.status === 'in_progress').length
  const completed = bookings.filter((b) => b.status === 'completed' || b.status === 'reviewed').length
  const revenue = bookings
    .filter((b) => b.status === 'completed' || b.status === 'reviewed')
    .reduce((s, b) => s + b.amount, 0)
  const fees = bookings
    .filter((b) => b.status === 'completed' || b.status === 'reviewed')
    .reduce((s, b) => s + b.platform_fee, 0)

  async function updateStatus(id: string, status: string) {
    if (!supabase) return
    await supabase.from('bookings').update({ status }).eq('id', id)
    await loadData()
  }

  async function createBooking() {
    if (!supabase) return
    const fee = form.amount * 0.15
    const payout = form.amount - fee
    await supabase.from('bookings').insert({
      customer_id: form.customer_name || null,
      cleaner_id: form.cleaner_id || null,
      status: form.cleaner_id ? 'assigned' : 'requested',
      service_type: form.service_type,
      scheduled_date: form.date,
      scheduled_time: form.time,
      amount: form.amount,
      platform_fee: fee,
      cleaner_payout: payout,
      address: form.address,
      notes: form.notes,
    })
    setShowModal(false)
    await loadData()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Bookings</h2>
          <p className="text-sm text-[#888]">Full job lifecycle</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg text-sm hover:bg-[#00e89c] transition-colors cursor-pointer"
        >
          + New Booking
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Total</div>
          <div className="text-2xl font-bold">{bookings.length}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Requested</div>
          <div className="text-2xl font-bold text-[#8b5cf6]">{requested}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Active</div>
          <div className="text-2xl font-bold text-[#00d28e]">{active}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Platform Fees</div>
          <div className="text-2xl font-bold text-[#ffd700]">${fees.toFixed(0)}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              filter === s
                ? 'bg-gradient-to-r from-[#00b4ff] to-[#8b5cf6] text-white'
                : 'bg-[rgba(255,255,255,0.04)] text-[#888] hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[#555]">
            <div className="text-4xl mb-3 opacity-30">📅</div>
            <p>No bookings yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#888] text-xs uppercase tracking-wide border-b border-[#1a1a1a]">
                  <th className="text-left py-3 px-4">Customer</th>
                  <th className="text-left py-3 px-4">Cleaner</th>
                  <th className="text-left py-3 px-4">Service</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Fee</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-[#151515] hover:bg-[#0f0f0f]">
                    <td className="py-3 px-4 font-medium">{b.id.slice(0, 8)}</td>
                    <td className="py-3 px-4 text-[#888]">{b.cleaner_id.slice(0, 8)}</td>
                    <td className="py-3 px-4 text-[#888]">{b.service_type}</td>
                    <td className="py-3 px-4">{fmtDate(b.scheduled_date)}</td>
                    <td className="py-3 px-4">${b.amount.toFixed(0)}</td>
                    <td className="py-3 px-4 text-[#ffd700]">${b.platform_fee.toFixed(0)}</td>
                    <td className="py-3 px-4">
                      <span className={`status-${b.status} inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold`}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {b.status === 'requested' && (
                          <button onClick={() => updateStatus(b.id, 'assigned')} className="px-2 py-1 text-xs bg-[rgba(0,180,255,0.12)] text-[#00b4ff] rounded cursor-pointer hover:bg-[rgba(0,180,255,0.2)]">📌</button>
                        )}
                        {b.status === 'assigned' && (
                          <button onClick={() => updateStatus(b.id, 'in_progress')} className="px-2 py-1 text-xs bg-[rgba(0,210,142,0.12)] text-[#00d28e] rounded cursor-pointer hover:bg-[rgba(0,210,142,0.2)]">🔄</button>
                        )}
                        {b.status === 'in_progress' && (
                          <button onClick={() => updateStatus(b.id, 'completed')} className="px-2 py-1 text-xs bg-[rgba(0,210,142,0.12)] text-[#00d28e] rounded cursor-pointer hover:bg-[rgba(0,210,142,0.2)]">✅</button>
                        )}
                        {b.status === 'completed' && (
                          <button onClick={() => updateStatus(b.id, 'reviewed')} className="px-2 py-1 text-xs bg-[rgba(255,215,0,0.12)] text-[#ffd700] rounded cursor-pointer hover:bg-[rgba(255,215,0,0.2)]">⭐</button>
                        )}
                        {(b.status === 'requested' || b.status === 'assigned') && (
                          <button onClick={() => updateStatus(b.id, 'cancelled')} className="px-2 py-1 text-xs bg-[rgba(255,80,80,0.12)] text-[#ff5050] rounded cursor-pointer hover:bg-[rgba(255,80,80,0.2)]">✕</button>
                        )}
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
            <h2 className="text-lg font-bold text-[#00d28e] mb-5">New Booking</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[#aaa] block mb-1">Customer</label>
                <select
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                >
                  <option value="">Select customer</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.profiles?.name || c.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#aaa] block mb-1">Cleaner</label>
                <select
                  value={form.cleaner_id}
                  onChange={(e) => setForm({ ...form, cleaner_id: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                >
                  <option value="">Auto-assign later</option>
                  {cleaners.filter((c: any) => c.status === 'active').map((c: any) => (
                    <option key={c.id} value={c.id}>{c.profiles?.name || c.id}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#aaa] block mb-1">Service</label>
                  <select
                    value={form.service_type}
                    onChange={(e) => setForm({ ...form, service_type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                  >
                    <option value="standard">Standard Clean</option>
                    <option value="deep">Deep Clean</option>
                    <option value="move">Move-Out/In</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#aaa] block mb-1">Amount ($)</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#aaa] block mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#aaa] block mb-1">Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#aaa] block mb-1">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#aaa] block mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e] resize-none h-16"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-[#1a1a1a] text-sm rounded-lg hover:bg-[#2a2a2a] cursor-pointer">Cancel</button>
              <button onClick={createBooking} className="px-4 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold text-sm rounded-lg hover:bg-[#00e89c] cursor-pointer">Create Booking</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
