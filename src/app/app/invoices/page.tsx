'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { fmtDate } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Card from '@/components/ui/Card'
import StatsCard from '@/components/ui/StatsCard'
import StatusBadge from '@/components/ui/StatusBadge'
import Table from '@/components/ui/Table'
import EmptyState from '@/components/ui/EmptyState'
import { DollarSign } from 'lucide-react'

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

  const columns = [
    { key: 'booking', label: 'Booking', render: (i: any) => <span className="font-medium">{i.id.slice(0, 8)}</span> },
    { key: 'amount', label: 'Amount', render: (i: any) => `$${i.amount.toFixed(0)}` },
    { key: 'fee', label: 'Fee', render: (i: any) => <span className="text-warning">${i.platform_fee.toFixed(0)}</span> },
    { key: 'date', label: 'Date', render: (i: any) => <span className="text-muted">{fmtDate(i.scheduled_date)}</span> },
    { key: 'status', label: 'Status', render: (i: any) => <StatusBadge status={i.status === 'completed' || i.status === 'reviewed' ? 'paid' : 'pending'} /> },
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
            <h2 className="text-xl font-bold text-foreground">Invoices</h2>
            <p className="text-sm text-muted">Payment tracking</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatsCard label="Paid" value={`$${paid.reduce((s, i) => s + i.amount, 0).toFixed(0)}`} accent="accent" />
            <StatsCard label="Pending" value={`$${pending.reduce((s, i) => s + i.amount, 0).toFixed(0)}`} accent="warning" />
            <StatsCard label="Total" value={`$${invoices.reduce((s, i) => s + i.amount, 0).toFixed(0)}`} accent="white" />
          </div>

          <Card padding="sm" className="p-0 overflow-hidden animate-fade-in">
            <Table
              columns={columns}
              data={invoices}
              emptyState={
                <EmptyState
                  icon={<DollarSign size={32} />}
                  title="No invoices yet"
                  description="Invoices will appear here once bookings are created"
                />
              }
            />
          </Card>
        </div>
      )}
    </div>
  )
}
