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
import { Star } from 'lucide-react'

export default function ReviewsPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [reviews, setReviews] = useState<any[]>([])
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
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setReviews(data)
    setPageLoading(false)
  }

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—'

  const fives = reviews.filter((r) => r.rating === 5).length

  function renderStars(rating: number) {
    const full = Math.floor(rating)
    const half = rating - full >= 0.5
    return (
      <span className="text-warning">{'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}</span>
    )
  }

  const columns = [
    { key: 'booking', label: 'Booking', render: (r: any) => <span className="font-medium">{r.booking_id.slice(0, 8)}</span> },
    { key: 'rating', label: 'Rating', render: (r: any) => <span className="text-warning">{renderStars(r.rating)}</span> },
    { key: 'comment', label: 'Comment', render: (r: any) => <span className="text-muted max-w-[200px] truncate block">{r.comment || '—'}</span> },
    { key: 'date', label: 'Date', render: (r: any) => <span className="text-muted">{fmtDate(r.created_at)}</span> },
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
            <h2 className="text-xl font-bold text-foreground">Reviews</h2>
            <p className="text-sm text-muted">Ratings and feedback</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatsCard label="Total Reviews" value={reviews.length} accent="white" />
            <StatsCard label="Average Rating" value={avg} accent="warning" />
            <StatsCard label="5-Star" value={fives} accent="accent" />
          </div>

          <Card padding="sm" className="p-0 overflow-hidden animate-fade-in">
            <Table
              columns={columns}
              data={reviews}
              emptyState={
                <EmptyState
                  icon={<Star size={32} />}
                  title="No reviews yet"
                  description="Reviews from customers will appear here"
                />
              }
            />
          </Card>
        </div>
      )}
    </div>
  )
}
