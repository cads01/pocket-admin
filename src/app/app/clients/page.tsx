'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Customer } from '@/lib/supabase'
import { fmtDate } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import { Users, Plus, Search, User, Mail, Phone, MapPin, DollarSign, Star, Trash2, Edit3, X, Building2, CreditCard, Calendar } from 'lucide-react'
import Card from '@/components/ui/Card'
import StatsCard from '@/components/ui/StatsCard'
import Table from '@/components/ui/Table'
import EmptyState from '@/components/ui/EmptyState'

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

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (c: any) => <span className="font-medium">{c.profiles?.name || '—'}</span>,
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (c: any) => <span className="text-muted">{c.profiles?.phone || '—'}</span>,
    },
    { key: 'total_jobs', label: 'Jobs' },
    {
      key: 'total_spent',
      label: 'Spent',
      render: (c: any) => `$${c.total_spent.toFixed(0)}`,
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (c: any) => <span className="text-muted">{fmtDate(c.created_at)}</span>,
    },
  ]

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      {pageLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton type="stats" />
          <LoadingSkeleton type="table" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="animate-fade-in-up">
            <h2 className="text-lg md:text-xl font-bold">Clients</h2>
            <p className="text-sm text-muted">End customers looking for cleaning services</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard label="Total Clients" value={customers.length} accent="purple" />
            <StatsCard label="Active" value={active} accent="accent" />
            <StatsCard label="Total Spent" value={`$${totalSpent.toFixed(0)}`} accent="white" />
          </div>

          <Card padding="sm" className="overflow-x-auto animate-fade-in-up">
            <div className="min-w-[600px]">
            <Table
              columns={columns}
              data={customers}
              emptyState={
                <EmptyState
                  icon={<Users size={48} className="text-muted" />}
                  title="No clients yet"
                  description="Clients will appear here once they book a service."
                />
              }
            />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
