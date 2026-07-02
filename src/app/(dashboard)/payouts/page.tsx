'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { fmtDate } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'

export default function PayoutsPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [payouts, setPayouts] = useState<any[]>([])
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
      .from('payouts')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setPayouts(data)
    setPageLoading(false)
  }

  async function markPaid(id: string) {
    if (!supabase) return
    await supabase
      .from('payouts')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id)
    await load()
  }

  const total = payouts.reduce((s, p) => s + p.amount, 0)
  const paid = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const pending = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="p-8">
      {pageLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton type="stats" />
          <LoadingSkeleton type="table" />
        </div>
      ) : (
        <>
          <div className="mb-6">
        <h2 className="text-xl font-bold">Payouts</h2>
        <p className="text-sm text-[#888]">Cleaner earnings tracking</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Total</div>
          <div className="text-2xl font-bold">${total.toFixed(0)}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Paid</div>
          <div className="text-2xl font-bold text-[#00d28e]">${paid.toFixed(0)}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Pending</div>
          <div className="text-2xl font-bold text-[#ffd700]">${pending.toFixed(0)}</div>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
        {payouts.length === 0 ? (
          <div className="text-center py-16 text-[#555]">
            <div className="text-4xl mb-3 opacity-30">💰</div>
            <p>No payouts yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#888] text-xs uppercase tracking-wide border-b border-[#1a1a1a]">
                  <th className="text-left py-3 px-4">Cleaner</th>
                  <th className="text-left py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Period</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Paid At</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-[#151515] hover:bg-[#0f0f0f]">
                    <td className="py-3 px-4 font-medium">{p.cleaner_id.slice(0, 8)}</td>
                    <td className="py-3 px-4">${p.amount.toFixed(2)}</td>
                    <td className="py-3 px-4 text-[#888]">{p.period || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`status-${p.status === 'paid' ? 'paid' : 'pending'} inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#888]">{p.paid_at ? fmtDate(p.paid_at) : '—'}</td>
                    <td className="py-3 px-4">
                      {p.status === 'pending' && (
                        <button
                          onClick={() => markPaid(p.id)}
                          className="px-3 py-1 text-xs bg-[rgba(0,210,142,0.12)] text-[#00d28e] rounded-md hover:bg-[rgba(0,210,142,0.2)] cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      )}
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
    </div>
  )
}
