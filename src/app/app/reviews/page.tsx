'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { fmtDate } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'

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
        <h2 className="text-xl font-bold">Reviews</h2>
        <p className="text-sm text-[#888]">Ratings and feedback</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Total Reviews</div>
          <div className="text-2xl font-bold">{reviews.length}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Average Rating</div>
          <div className="text-2xl font-bold text-[#ffd700]">{avg}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">5-Star</div>
          <div className="text-2xl font-bold text-[#00d28e]">{fives}</div>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
        {reviews.length === 0 ? (
          <div className="text-center py-16 text-[#555]">
            <div className="text-4xl mb-3 opacity-30">⭐</div>
            <p>No reviews yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#888] text-xs uppercase tracking-wide border-b border-[#1a1a1a]">
                  <th className="text-left py-3 px-4">Booking</th>
                  <th className="text-left py-3 px-4">Rating</th>
                  <th className="text-left py-3 px-4">Comment</th>
                  <th className="text-left py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-b border-[#151515] hover:bg-[#0f0f0f]">
                    <td className="py-3 px-4 font-medium">{r.booking_id.slice(0, 8)}</td>
                    <td className="py-3 px-4 text-[#ffd700]">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
                    <td className="py-3 px-4 text-[#888] max-w-[200px] truncate">{r.comment || '—'}</td>
                    <td className="py-3 px-4 text-[#888]">{fmtDate(r.created_at)}</td>
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
