'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Customer } from '@/lib/supabase'
import { fmtDate } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'

export default function ClientsPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    load()
  }, [user, loading])

  async function load() {
    if (!supabase) return
    setPageLoading(true)
    const { data } = await supabase.from('customers').select('*, profiles!inner(name, email, phone)')
    if (data) setCustomers(data as any)
    setPageLoading(false)
  }

  const active = customers.filter((c) => c.total_jobs > 0).length
  const totalSpent = customers.reduce((s, c) => s + c.total_spent, 0)

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
        <h2 className="text-xl font-bold">Clients</h2>
        <p className="text-sm text-[#888]">End customers looking for cleaning services</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Total Clients</div>
          <div className="text-2xl font-bold text-[#8b5cf6]">{customers.length}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Active</div>
          <div className="text-2xl font-bold text-[#00d28e]">{active}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Total Spent</div>
          <div className="text-2xl font-bold text-white">${totalSpent.toFixed(0)}</div>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
        {customers.length === 0 ? (
          <div className="text-center py-16 text-[#555]">
            <div className="text-4xl mb-3 opacity-30">👥</div>
            <p>No clients yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#888] text-xs uppercase tracking-wide border-b border-[#1a1a1a]">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Phone</th>
                  <th className="text-left py-3 px-4">Jobs</th>
                  <th className="text-left py-3 px-4">Spent</th>
                  <th className="text-left py-3 px-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.id} className="border-b border-[#151515] hover:bg-[#0f0f0f]">
                    <td className="py-3 px-4 font-medium">{c.profiles?.name || '—'}</td>
                    <td className="py-3 px-4 text-[#888]">{c.profiles?.phone || '—'}</td>
                    <td className="py-3 px-4">{c.total_jobs}</td>
                    <td className="py-3 px-4">${c.total_spent.toFixed(0)}</td>
                    <td className="py-3 px-4 text-[#888]">{fmtDate(c.created_at)}</td>
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
