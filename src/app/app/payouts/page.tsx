'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { fmtDate } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Card from '@/components/ui/Card'
import StatsCard from '@/components/ui/StatsCard'
import StatusBadge from '@/components/ui/StatusBadge'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import EmptyState from '@/components/ui/EmptyState'
import { DollarSign } from 'lucide-react'

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

  const columns = [
    { key: 'cleaner', label: 'Cleaner', render: (p: any) => <span className="font-medium">{p.cleaner_id.slice(0, 8)}</span> },
    { key: 'amount', label: 'Amount', render: (p: any) => `$${p.amount.toFixed(2)}` },
    { key: 'period', label: 'Period', render: (p: any) => <span className="text-muted">{p.period || '—'}</span> },
    { key: 'status', label: 'Status', render: (p: any) => <StatusBadge status={p.status} /> },
    { key: 'paid_at', label: 'Paid At', render: (p: any) => <span className="text-muted">{p.paid_at ? fmtDate(p.paid_at) : '—'}</span> },
    { key: 'actions', label: 'Actions', render: (p: any) => p.status === 'pending' ? <Button variant="ghost" size="sm" onClick={() => markPaid(p.id)}>Mark Paid</Button> : null },
  ]

  return (
    <div className="p-8">
      {pageLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton type="stats" />
          <LoadingSkeleton type="table" />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-bold text-foreground">Payouts</h2>
            <p className="text-sm text-muted">Cleaner earnings tracking</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatsCard label="Total" value={`$${total.toFixed(0)}`} accent="white" />
            <StatsCard label="Paid" value={`$${paid.toFixed(0)}`} accent="accent" />
            <StatsCard label="Pending" value={`$${pending.toFixed(0)}`} accent="warning" />
          </div>

          <Card padding="sm" className="p-0 overflow-hidden animate-fade-in">
            <Table
              columns={columns}
              data={payouts}
              emptyState={
                <EmptyState
                  icon={<DollarSign size={32} />}
                  title="No payouts yet"
                  description="Payouts will appear here once processed"
                />
              }
            />
          </Card>
        </div>
      )}
    </div>
  )
}
