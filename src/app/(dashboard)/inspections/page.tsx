'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Booking, BookingTask, TaskPhoto } from '@/lib/supabase'
import { fmtDate } from '@/lib/utils'

export default function InspectionPortal() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [tasks, setTasks] = useState<BookingTask[]>([])
  const [photos, setPhotos] = useState<TaskPhoto[]>([])
  const [flaggedAreas, setFlaggedAreas] = useState<string[]>([])
  const [clientNotes, setClientNotes] = useState('')

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    load()
  }, [user, loading])

  async function load() {
    if (!supabase) return
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .in('status', ['completed', 'reviewed'])
      .order('created_at', { ascending: false })
    if (data) setBookings(data)
  }

  async function selectBooking(b: Booking) {
    setSelectedBooking(b)
    setFlaggedAreas([])
    setClientNotes('')
    if (!supabase) return

    const { data: t } = await supabase
      .from('booking_tasks')
      .select('*')
      .eq('booking_id', b.id)
    if (t) setTasks(t)

    const { data: p } = await supabase
      .from('task_photos')
      .select('*')
      .eq('booking_id', b.id)
    if (p) setPhotos(p)
  }

  async function submitInspection(approved: boolean) {
    if (!supabase || !selectedBooking) return

    await supabase.from('inspection_reports').insert({
      booking_id: selectedBooking.id,
      client_approved: approved,
      flagged_areas: flaggedAreas,
      client_notes: clientNotes,
    })

    if (approved) {
      await supabase
        .from('bookings')
        .update({ inspection_status: 'approved', status: 'reviewed', escrow_status: 'approved' })
        .eq('id', selectedBooking.id)
    } else {
      await supabase
        .from('bookings')
        .update({ inspection_status: 'flagged', recovery_status: 'requested', recovery_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() })
        .eq('id', selectedBooking.id)
    }

    setSelectedBooking(null)
    load()
  }

  const completed = tasks.filter(t => t.is_completed).length
  const total = tasks.length

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Inspection Portal</h2>
        <p className="text-sm text-[#888]">Review completed work — approve or flag areas</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Completed Jobs</div>
          <div className="text-2xl font-bold">{bookings.length}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Pending Inspection</div>
          <div className="text-2xl font-bold text-[#ffd700]">
            {bookings.filter(b => b.inspection_status === 'pending').length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Booking list */}
        <div className="col-span-1 bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
          {bookings.length === 0 ? (
            <div className="text-center py-12 text-[#555] text-sm">
              <p>No completed bookings</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {bookings.map(b => (
                <button
                  key={b.id}
                  onClick={() => selectBooking(b)}
                  className={`w-full text-left p-3 hover:bg-[#0f0f0f] cursor-pointer ${selectedBooking?.id === b.id ? 'bg-[#0f0f0f] border-l-2 border-[#00d28e]' : ''}`}
                >
                  <div className="text-xs font-mono text-[#888]">{b.id.slice(0, 8)}</div>
                  <div className="text-sm font-semibold">{fmtDate(b.scheduled_date)}</div>
                  <div className="text-xs text-[#555]">${b.amount.toFixed(0)}</div>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mt-1 ${
                    b.inspection_status === 'approved' ? 'bg-[rgba(0,210,142,0.12)] text-[#00d28e]'
                    : b.inspection_status === 'flagged' ? 'bg-[rgba(255,80,80,0.12)] text-[#ff5050]'
                    : 'bg-[rgba(255,215,0,0.12)] text-[#ffd700]'
                  }`}>
                    {b.inspection_status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Inspection detail */}
        <div className="col-span-2 bg-[#111] border border-[#1a1a1a] rounded-xl p-6">
          {!selectedBooking ? (
            <div className="text-center py-16 text-[#555] text-sm">
              <p>Select a booking to inspect</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold">Booking {selectedBooking.id.slice(0, 8)}</h3>
                  <p className="text-xs text-[#888]">{fmtDate(selectedBooking.scheduled_date)}</p>
                </div>
                <span className={`text-sm font-semibold ${
                  selectedBooking.inspection_status === 'approved' ? 'text-[#00d28e]'
                  : selectedBooking.inspection_status === 'flagged' ? 'text-[#ff5050]'
                  : 'text-[#ffd700]'
                }`}>
                  {selectedBooking.inspection_status}
                </span>
              </div>

              {/* Task completion */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[#888]">Task Completion</span>
                  <span className="font-semibold">{completed}/{total}</span>
                </div>
                <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00d28e] rounded-full transition-all" style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
                </div>
              </div>

              {/* Photos */}
              {photos.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">Before & After Photos</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map(p => (
                      <div key={p.id} className="bg-[#0d0d0d] rounded-lg p-2 text-center">
                        <div className="w-full h-16 bg-[#1a1a1a] rounded flex items-center justify-center text-[#555] text-xs mb-1">
                          📷
                        </div>
                        <span className="text-[10px] text-[#888]">{p.photo_type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">Room-by-Room Tasks</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {tasks.map(t => (
                    <div key={t.id} className={`flex items-center gap-2 text-xs p-1.5 rounded ${t.is_completed ? 'text-[#555]' : 'text-[#ff5050]'}`}>
                      <span>{t.is_completed ? '✓' : '○'}</span>
                      <span className="text-[#888]">{t.room}:</span>
                      <span>{t.task}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flag areas */}
              {selectedBooking.inspection_status === 'pending' && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">Flag Missed Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {tasks.filter(t => !t.is_completed).map(t => (
                        <button
                          key={t.id}
                          onClick={() => setFlaggedAreas(prev => prev.includes(t.task) ? prev.filter(f => f !== t.task) : [...prev, t.task])}
                          className={`px-2 py-1 text-xs rounded border cursor-pointer ${
                            flaggedAreas.includes(t.task) ? 'border-[#ff5050] bg-[rgba(255,80,80,0.12)] text-[#ff5050]' : 'border-[#2a2a2a] text-[#888] hover:border-[#ff5050]'
                          }`}
                        >
                          {t.task}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#aaa] block mb-1">Client Notes</label>
                    <textarea
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                      placeholder="Describe any issues..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => submitInspection(true)} className="flex-1 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg text-sm cursor-pointer">
                      ✓ Approve & Release Payment
                    </button>
                    <button onClick={() => submitInspection(false)} className="flex-1 py-2 bg-[#ff5050] text-white font-semibold rounded-lg text-sm cursor-pointer">
                      ⚑ Flag Issues
                    </button>
                  </div>
                </div>
              )}

              {selectedBooking.inspection_status === 'approved' && (
                <div className="bg-[rgba(0,210,142,0.08)] border border-[rgba(0,210,142,0.2)] rounded-lg p-3 text-sm text-[#00d28e] text-center">
                  ✓ Approved — Payment released to cleaner
                </div>
              )}

              {selectedBooking.inspection_status === 'flagged' && (
                <div className="bg-[rgba(255,80,80,0.08)] border border-[rgba(255,80,80,0.2)] rounded-lg p-3 text-sm text-[#ff5050] text-center">
                  ⚑ Issues flagged — Recovery workflow active (2h window)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
