'use client'

import { useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Card from '@/components/ui/Card'
import StatsCard from '@/components/ui/StatsCard'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'
import { DollarSign } from 'lucide-react'

export default function PayoutsPage() {
  const { loading } = useSupabase()
  const router = useRouter()
  const [payouts] = useState<any[]>([])
  const [pageLoading] = useState(false)

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
            <EmptyState
              icon={<DollarSign size={32} />}
              title="No payouts yet"
              description="Payouts will appear here once processed"
            />
          </Card>
        </div>
      )}
    </div>
  )
}
