'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { fmtDate } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'

export default function InvoicesPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [invoices, setInvoices] = useState<any[]>([])
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
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setInvoices(data)
    setPageLoading(false)
  }

  const paid = invoices.filter((i) => i.status === 'completed' || i.status === 'reviewed')
  const pending = invoices.filter((i) => i.status === 'assigned' || i.status === 'in_progress')

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
        <h2 className="text-xl font-bold">Invoices</h2>
        <p className="text-sm text-[#888]">Payment tracking</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Paid</div>
          <div className="text-2xl font-bold text-[#00d28e]">
            ${paid.reduce((s, i) => s + i.amount, 0).toFixed(0)}
          </div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Pending</div>
          <div className="text-2xl font-bold text-[#ffd700]">
            ${pending.reduce((s, i) => s + i.amount, 0).toFixed(0)}
          </div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Total</div>
          <div className="text-2xl font-bold text-white">
            ${invoices.reduce((s, i) => s + i.amount, 0).toFixed(0)}
          </div>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-16 text-[#555]">
            <div className="text-4xl mb-3 opacity-30">💰</div>
            <p>No invoices yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#888] text-xs uppercase tracking-wide border-b border-[#1a1a1a]">
                  <th className="text-left py-3 px-4">Booking</th>
                  <th className="text-left py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Fee</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-b border-[#151515] hover:bg-[#0f0f0f]">
                    <td className="py-3 px-4 font-medium">{i.id.slice(0, 8)}</td>
                    <td className="py-3 px-4">${i.amount.toFixed(0)}</td>
                    <td className="py-3 px-4 text-[#ffd700]">${i.platform_fee.toFixed(0)}</td>
                    <td className="py-3 px-4 text-[#888]">{fmtDate(i.scheduled_date)}</td>
                    <td className="py-3 px-4">
                      <span className={`status-${i.status} inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold`}>
                        {i.status === 'completed' || i.status === 'reviewed' ? 'Paid' : 'Pending'}
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
    </div>
  )
}
