'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Booking, Cleaner, ClockEvent, Employee } from '@/lib/supabase'
import { fmtDate } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Card from '@/components/ui/Card'
import StatsCard from '@/components/ui/StatsCard'
import StatusBadge from '@/components/ui/StatusBadge'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import EmptyState from '@/components/ui/EmptyState'
import Input from '@/components/ui/Input'
import { Calendar, Clock, DollarSign, Check, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'

const DEFAULT_ROOMS = [
  { room: 'Kitchen', tasks: ['Countertops & surfaces', 'Sink & faucet', 'Stovetop & range', 'Microwave interior', 'Cabinet exteriors', 'Sweep & mop floor', 'Take out trash'] },
  { room: 'Bathroom', tasks: ['Toilet (interior & exterior)', 'Sink & vanity', 'Mirror', 'Shower/tub', 'Towel racks', 'Sweep & mop floor'] },
  { room: 'Living Room', tasks: ['Dust surfaces', 'Vacuum carpets', 'Sweep hard floors', 'Wipe windowsills', 'Tidy cushions', 'Clean coffee table'] },
  { room: 'Bedroom', tasks: ['Make bed', 'Dust surfaces', 'Vacuum floor', 'Wipe windowsills', 'Organize nightstand', 'Empty trash'] },
]

export default function BookingWizard() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const { success, error } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([])
  const [showWizard, setShowWizard] = useState(false)

  // Wizard state
  const [step, setStep] = useState(0)
  const [selectedCleaner, setSelectedCleaner] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [address, setAddress] = useState('')
  const [hours, setHours] = useState(2)
  const [selectedRooms, setSelectedRooms] = useState<{room: string; tasks: {task: string; checked: boolean}[]}[]>(
    DEFAULT_ROOMS.map(r => ({ room: r.room, tasks: r.tasks.map(t => ({ task: t, checked: true })) }))
  )
  const [submitting, setSubmitting] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  const stats = useMemo(() => ({
    total: bookings.length,
    revenue: bookings.reduce((s, b) => s + b.amount, 0),
    active: bookings.filter(b => b.status === 'in_progress').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  }), [bookings])

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    load()
  }, [user, loading])

  async function load() {
    if (!supabase) return
    setPageLoading(true)
    const { data: b } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (b) setBookings(b)

    const { data: c } = await supabase.from('cleaners').select('*').eq('verified', true)
    if (c) setCleaners(c)

    const { data: e } = await supabase.from('employees').select('*').eq('status', 'active')
    if (e) setEmployees(e)

    const { data: ce } = await supabase.from('clock_events').select('*').order('clock_in', { ascending: false })
    if (ce) setClockEvents(ce)

    setPageLoading(false)
  }

  async function createBooking() {
    if (!supabase || !selectedCleaner || !selectedDate || !address) return
    setSubmitting(true)
    try {
      const total = (cleaners.find(c => c.id === selectedCleaner)?.hourly_rate || 50) * hours
      const fee = Math.round(total * 0.15)
      const cleanerCut = total - fee

      const { data: booking } = await supabase
        .from('bookings')
        .insert({
          cleaner_id: selectedCleaner,
          employee_id: selectedEmployee || null,
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
      success('Booking created successfully')
    } catch {
      error('Failed to create booking')
      setSubmitting(false)
    }
  }

  async function clockIn(bookingId: string, employeeId: string) {
    if (!supabase) return
    try {
      await supabase.from('clock_events').insert({
        employee_id: employeeId,
        booking_id: bookingId,
        clock_in: new Date().toISOString(),
      })
      load()
      success('Clocked in')
    } catch {
      error('Failed to clock in')
    }
  }

  async function clockOut(clockEventId: string) {
    if (!supabase) return
    try {
      await supabase.from('clock_events').update({ clock_out: new Date().toISOString() }).eq('id', clockEventId)
      load()
      success('Clocked out')
    } catch {
      error('Failed to clock out')
    }
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

  const escrowVariant = (status: string) => {
    if (status === 'released' || status === 'approved') return 'accent'
    if (status === 'disputed' || status === 'flagged') return 'danger'
    return 'warning'
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (b: Booking) => <span className="font-mono text-xs">{b.id.slice(0, 8)}</span>,
    },
    {
      key: 'scheduled_date',
      label: 'Date',
      render: (b: Booking) => <>{fmtDate(b.scheduled_date)}</>,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (b: Booking) => <>${b.amount.toFixed(0)}</>,
    },
    {
      key: 'escrow',
      label: 'Escrow',
      render: (b: Booking) => (
        <Badge variant={escrowVariant(b.escrow_status)}>{b.escrow_status}</Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (b: Booking) => <StatusBadge status={b.status} />,
    },
    {
      key: 'inspection',
      label: 'Inspection',
      render: (b: Booking) => (
        <Badge variant={escrowVariant(b.inspection_status)}>{b.inspection_status}</Badge>
      ),
    },
    {
      key: 'clock',
      label: 'Clock',
      render: (b: Booking) => {
        if (b.status === 'in_progress' && b.employee_id) {
          const activeClock = clockEvents.find(ce => ce.booking_id === b.id && !ce.clock_out)
          if (activeClock) {
            return (
              <Button variant="danger" size="sm" onClick={() => clockOut(activeClock.id)}>
                Clock Out
              </Button>
            )
          }
          return (
            <Button variant="primary" size="sm" onClick={() => clockIn(b.id, b.employee_id!)}>
              Clock In
            </Button>
          )
        }
        return <span className="text-muted-foreground text-xs">—</span>
      },
    },
  ]

  return (
    <div className="p-8 animate-fade-in">
      {pageLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton type="stats" />
          <LoadingSkeleton type="table" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6 animate-fade-in-up">
            <div>
              <h2 className="text-xl font-bold">Bookings</h2>
              <p className="text-sm text-muted">Room-by-room booking wizard</p>
            </div>
            <Button icon={Plus} onClick={() => setShowWizard(true)}>New Booking</Button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6 animate-slide-down">
            <StatsCard label="Total Bookings" value={stats.total} icon={Calendar} />
            <StatsCard label="Revenue" value={`$${stats.revenue}`} icon={DollarSign} />
            <StatsCard label="In Progress" value={stats.active} icon={Clock} accent="info" />
            <StatsCard label="Completed" value={stats.completed} icon={Check} accent="accent" />
          </div>

          <Modal
            open={showWizard}
            onClose={() => setShowWizard(false)}
            title={step === 0 ? 'Select Cleaner & Time' : step === 1 ? 'Room-by-Room Checklist' : 'Review & Confirm'}
            size="lg"
          >
            <div className="flex gap-1 mb-6">
              {[0, 1, 2].map(s => (
                <div key={s} className={`flex-1 h-1 rounded ${s <= step ? 'bg-accent' : 'bg-card-border'}`} />
              ))}
            </div>

            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted block mb-1">Cleaner</label>
                  <select
                    value={selectedCleaner}
                    onChange={(e) => setSelectedCleaner(e.target.value)}
                    className="w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-input-focus"
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
                  <label className="text-xs font-medium text-muted block mb-1">Assign Employee</label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-input-focus"
                  >
                    <option value="">No employee assigned</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — ${emp.hourly_rate}/hr
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Date & Time"
                  type="datetime-local"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                <Input
                  label="Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St"
                />
                <div>
                  <label className="text-xs font-medium text-muted block mb-1">Duration</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 6].map(h => (
                      <Button
                        key={h}
                        variant={hours === h ? 'primary' : 'secondary'}
                        size="md"
                        onClick={() => setHours(h)}
                        className="flex-1"
                      >
                        {h}h
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted">Select the rooms and tasks for this booking:</p>
                {selectedRooms.map((r, ri) => (
                  <Card key={r.room} padding="sm">
                    <Button
                      variant="ghost"
                      onClick={() => toggleAllRoom(ri)}
                      className="w-full !justify-start text-left font-semibold text-sm mb-2 gap-2"
                      size="sm"
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                        r.tasks.every(t => t.checked) ? 'bg-accent border-accent text-[#0a0a0a]' : 'border-input-border'
                      }`}>
                        {r.tasks.every(t => t.checked) ? <Check size={10} /> : ''}
                      </span>
                      {r.room}
                    </Button>
                    <div className="space-y-1 ml-6">
                      {r.tasks.map((t, ti) => (
                        <Button
                          key={t.task}
                          variant="ghost"
                          onClick={() => toggleRoomTask(ri, ti)}
                          className={`w-full !justify-start text-left text-xs gap-2 ${
                            t.checked ? '!text-foreground' : '!text-muted-foreground'
                          }`}
                          size="sm"
                        >
                          <span className={`w-3 h-3 rounded-sm border flex items-center justify-center text-[8px] ${
                            t.checked ? 'bg-accent border-accent text-[#0a0a0a]' : 'border-input-border'
                          }`}>
                            {t.checked ? <Check size={8} /> : ''}
                          </span>
                          {t.task}
                        </Button>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <Card padding="sm">
                  <div className="flex justify-between mb-1"><span className="text-muted">Cleaner</span><span>{cleaners.find(c => c.id === selectedCleaner)?.business || 'Selected'}</span></div>
                  <div className="flex justify-between mb-1"><span className="text-muted">Date</span><span>{fmtDate(selectedDate)}</span></div>
                  <div className="flex justify-between mb-1"><span className="text-muted">Duration</span><span>{hours}h</span></div>
                  <div className="flex justify-between mb-1"><span className="text-muted">Rooms</span><span>{selectedRooms.filter(r => r.tasks.some(t => t.checked)).length}</span></div>
                  <div className="flex justify-between mb-1"><span className="text-muted">Tasks</span><span>{selectedRooms.reduce((s, r) => s + r.tasks.filter(t => t.checked).length, 0)}</span></div>
                  <div className="border-t border-card-border pt-1 mt-1 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-accent">${((cleaners.find(c => c.id === selectedCleaner)?.hourly_rate || 50) * hours).toFixed(0)}</span>
                  </div>
                </Card>
                <Card padding="sm">
                  <p className="text-muted mb-1">Selected rooms:</p>
                  <ul className="text-xs space-y-0.5">
                    {selectedRooms.filter(r => r.tasks.some(t => t.checked)).map(r => (
                      <li key={r.room} className="flex items-center gap-1">
                        <Check size={10} className="text-accent" />
                        {r.room} ({r.tasks.filter(t => t.checked).length} tasks)
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <Button variant="secondary" onClick={() => setStep(step - 1)} className="flex-1">
                  Back
                </Button>
              )}
              {step < 2 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 0 && (!selectedCleaner || !selectedDate || !address)}
                  className="flex-1"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={createBooking}
                  loading={submitting}
                  className="flex-1"
                >
                  {submitting ? 'Creating...' : 'Confirm Booking'}
                </Button>
              )}
            </div>
          </Modal>

          <div className="animate-fade-in-up">
            {bookings.length === 0 ? (
              <Card padding="sm">
                <EmptyState
                  icon={<Calendar size={40} />}
                  title="No bookings yet"
                  description="Create your first booking to get started"
                  action={{ label: 'Create Booking', onClick: () => setShowWizard(true) }}
                />
              </Card>
            ) : (
              <Card className="overflow-hidden !p-0">
                <Table<Booking>
                  columns={columns}
                  data={bookings}
                />
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
