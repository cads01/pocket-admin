'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Booking, BookingTask, TaskPhoto, Cleaner } from '@/lib/supabase'
import { fmtDate } from '@/lib/utils'

const DEFAULT_ROOMS = [
  { room: 'Kitchen', tasks: ['Countertops & surfaces', 'Sink & faucet', 'Stovetop & range', 'Microwave interior', 'Cabinet exteriors', 'Sweep & mop floor', 'Take out trash'] },
  { room: 'Bathroom', tasks: ['Toilet (interior & exterior)', 'Sink & vanity', 'Mirror', 'Shower/tub', 'Towel racks', 'Sweep & mop floor'] },
  { room: 'Living Room', tasks: ['Dust surfaces', 'Vacuum carpets', 'Sweep hard floors', 'Wipe windowsills', 'Tidy cushions', 'Clean coffee table'] },
  { room: 'Bedroom', tasks: ['Make bed', 'Dust surfaces', 'Vacuum floor', 'Wipe windowsills', 'Organize nightstand', 'Empty trash'] },
]

export default function BookingWizard() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [showWizard, setShowWizard] = useState(false)

  // Wizard state
  const [step, setStep] = useState(0)
  const [selectedCleaner, setSelectedCleaner] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [address, setAddress] = useState('')
  const [hours, setHours] = useState(2)
  const [selectedRooms, setSelectedRooms] = useState<{room: string; tasks: {task: string; checked: boolean}[]}[]>(
    DEFAULT_ROOMS.map(r => ({ room: r.room, tasks: r.tasks.map(t => ({ task: t, checked: true })) }))
  )
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    load()
  }, [user, loading])

  async function load() {
    if (!supabase) return
    const { data: b } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (b) setBookings(b)

    const { data: c } = await supabase.from('cleaners').select('*').eq('verified', true)
    if (c) setCleaners(c)
  }

  async function createBooking() {
    if (!supabase || !selectedCleaner || !selectedDate || !address) return
    setSubmitting(true)

    const total = (cleaners.find(c => c.id === selectedCleaner)?.hourly_rate || 50) * hours
    const fee = Math.round(total * 0.15)
    const cleanerCut = total - fee

    const { data: booking } = await supabase
      .from('bookings')
      .insert({
        cleaner_id: selectedCleaner,
        customer_id: user!.id,
        scheduled_date: selectedDate,
        duration: hours,
        amount: Math.round(total),
        platform_fee: fee,
        cleaner_amount: Math.round(cleanerCut),
        address,
        status: 'requested',
        escrow_status: 'held',
        inspection_status: 'pending',
        recovery_status: 'none',
      })
      .select('id')
      .single()

    if (booking) {
      const tasksToInsert: any[] = []
      selectedRooms.forEach(r => {
        r.tasks.filter(t => t.checked).forEach(t => {
          tasksToInsert.push({
            booking_id: booking.id,
            room: r.room,
            task: t.task,
          })
        })
      })
      if (tasksToInsert.length > 0) {
        await supabase.from('booking_tasks').insert(tasksToInsert)
      }
    }

    setSubmitting(false)
    setShowWizard(false)
    setStep(0)
    load()
  }

  const toggleRoomTask = (roomIdx: number, taskIdx: number) => {
    const copy = [...selectedRooms]
    copy[roomIdx].tasks[taskIdx].checked = !copy[roomIdx].tasks[taskIdx].checked
    setSelectedRooms(copy)
  }

  const toggleAllRoom = (roomIdx: number) => {
    const copy = [...selectedRooms]
    const allChecked = copy[roomIdx].tasks.every(t => t.checked)
    copy[roomIdx].tasks = copy[roomIdx].tasks.map(t => ({ ...t, checked: !allChecked }))
    setSelectedRooms(copy)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Bookings</h2>
          <p className="text-sm text-[#888]">Room-by-room booking wizard</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="px-4 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg text-sm cursor-pointer"
        >
          + New Booking
        </button>
      </div>

      {/* Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">
                  {step === 0 ? 'Select Cleaner & Time' : step === 1 ? 'Room-by-Room Checklist' : 'Review & Confirm'}
                </h3>
                <button onClick={() => setShowWizard(false)} className="text-[#555] hover:text-white text-xl cursor-pointer">&times;</button>
              </div>

              {/* Step indicator */}
              <div className="flex gap-1 mb-6">
                {[0, 1, 2].map(s => (
                  <div key={s} className={`flex-1 h-1 rounded ${s <= step ? 'bg-[#00d28e]' : 'bg-[#1a1a1a]'}`} />
                ))}
              </div>

              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[#aaa] block mb-1">Cleaner</label>
                    <select
                      value={selectedCleaner}
                      onChange={(e) => setSelectedCleaner(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                    >
                      <option value="">Select a cleaner...</option>
                      {cleaners.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.business || c.id.slice(0, 8)} — ${c.hourly_rate}/hr
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#aaa] block mb-1">Date & Time</label>
                    <input
                      type="datetime-local"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#aaa] block mb-1">Address</label>
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Main St"
                      className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#aaa] block mb-1">Duration</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 6].map(h => (
                        <button
                          key={h}
                          onClick={() => setHours(h)}
                          className={`flex-1 py-2 rounded-lg text-sm border cursor-pointer ${
                            hours === h ? 'bg-[#00d28e] text-[#0a0a0a] border-[#00d28e] font-semibold' : 'bg-[#1a1a1a] text-[#888] border-[#2a2a2a] hover:border-[#00d28e]'
                          }`}
                        >
                          {h}h
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-[#888]">Select the rooms and tasks for this booking:</p>
                  {selectedRooms.map((r, ri) => (
                    <div key={r.room} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-3">
                      <button
                        onClick={() => toggleAllRoom(ri)}
                        className="flex items-center gap-2 w-full text-left font-semibold text-sm mb-2 cursor-pointer"
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                          r.tasks.every(t => t.checked) ? 'bg-[#00d28e] border-[#00d28e] text-[#0a0a0a]' : 'border-[#2a2a2a]'
                        }`}>
                          {r.tasks.every(t => t.checked) ? '✓' : ''}
                        </span>
                        {r.room}
                      </button>
                      <div className="space-y-1 ml-6">
                        {r.tasks.map((t, ti) => (
                          <button
                            key={t.task}
                            onClick={() => toggleRoomTask(ri, ti)}
                            className={`flex items-center gap-2 text-xs w-full text-left cursor-pointer ${
                              t.checked ? 'text-white' : 'text-[#555]'
                            }`}
                          >
                            <span className={`w-3 h-3 rounded-sm border flex items-center justify-center text-[8px] ${
                              t.checked ? 'bg-[#00d28e] border-[#00d28e] text-[#0a0a0a]' : 'border-[#2a2a2a]'
                            }`}>
                              {t.checked ? '✓' : ''}
                            </span>
                            {t.task}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-3 text-sm">
                    <div className="flex justify-between mb-1"><span className="text-[#888]">Cleaner</span><span>{cleaners.find(c => c.id === selectedCleaner)?.business || 'Selected'}</span></div>
                    <div className="flex justify-between mb-1"><span className="text-[#888]">Date</span><span>{fmtDate(selectedDate)}</span></div>
                    <div className="flex justify-between mb-1"><span className="text-[#888]">Duration</span><span>{hours}h</span></div>
                    <div className="flex justify-between mb-1"><span className="text-[#888]">Rooms</span><span>{selectedRooms.filter(r => r.tasks.some(t => t.checked)).length}</span></div>
                    <div className="flex justify-between mb-1"><span className="text-[#888]">Tasks</span><span>{selectedRooms.reduce((s, r) => s + r.tasks.filter(t => t.checked).length, 0)}</span></div>
                    <div className="border-t border-[#1a1a1a] pt-1 mt-1 flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-[#00d28e]">${((cleaners.find(c => c.id === selectedCleaner)?.hourly_rate || 50) * hours).toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-3 text-sm">
                    <p className="text-[#888] mb-1">Selected rooms:</p>
                    <ul className="text-xs space-y-0.5">
                      {selectedRooms.filter(r => r.tasks.some(t => t.checked)).map(r => (
                        <li key={r.room} className="flex items-center gap-1">
                          <span className="text-[#00d28e]">✓</span>
                          {r.room} ({r.tasks.filter(t => t.checked).length} tasks)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                {step > 0 && (
                  <button onClick={() => setStep(step - 1)} className="flex-1 py-2.5 bg-[#1a1a1a] rounded-lg text-sm cursor-pointer">
                    Back
                  </button>
                )}
                {step < 2 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 0 && (!selectedCleaner || !selectedDate || !address)}
                    className="flex-1 py-2.5 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg text-sm disabled:opacity-50 cursor-pointer"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={createBooking}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg text-sm disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Creating...' : 'Confirm Booking'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking list */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
        {bookings.length === 0 ? (
          <div className="text-center py-16 text-[#555]">
            <p>No bookings yet</p>
            <button onClick={() => setShowWizard(true)} className="mt-3 px-4 py-2 bg-[#00d28e] text-[#0a0a0a] text-sm rounded-lg cursor-pointer">
              Create your first booking
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#888] text-xs uppercase tracking-wide border-b border-[#1a1a1a]">
                  <th className="text-left py-3 px-4">ID</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Escrow</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Inspection</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} className="border-b border-[#151515] hover:bg-[#0f0f0f]">
                    <td className="py-3 px-4 font-mono text-xs">{b.id.slice(0, 8)}</td>
                    <td className="py-3 px-4">{fmtDate(b.scheduled_date)}</td>
                    <td className="py-3 px-4">${b.amount.toFixed(0)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        b.escrow_status === 'released' ? 'bg-[rgba(0,210,142,0.12)] text-[#00d28e]'
                        : b.escrow_status === 'disputed' ? 'bg-[rgba(255,80,80,0.12)] text-[#ff5050]'
                        : 'bg-[rgba(255,215,0,0.12)] text-[#ffd700]'
                      }`}>
                        {b.escrow_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold status-${b.status}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        b.inspection_status === 'approved' ? 'bg-[rgba(0,210,142,0.12)] text-[#00d28e]'
                        : b.inspection_status === 'flagged' ? 'bg-[rgba(255,80,80,0.12)] text-[#ff5050]'
                        : 'bg-[rgba(255,215,0,0.12)] text-[#ffd700]'
                      }`}>
                        {b.inspection_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
