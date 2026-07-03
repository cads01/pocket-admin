'use client'

import { useEffect, useState, useRef } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Booking, BookingTask, TaskPhoto } from '@/lib/supabase'
import { fmtDate } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Card from '@/components/ui/Card'
import StatsCard from '@/components/ui/StatsCard'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { ClipboardCheck, Camera, AlertTriangle, CheckCircle, Flag } from 'lucide-react'

export default function InspectionPortal() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [tasks, setTasks] = useState<BookingTask[]>([])
  const [photos, setPhotos] = useState<TaskPhoto[]>([])
  const [flaggedAreas, setFlaggedAreas] = useState<string[]>([])
  const [clientNotes, setClientNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadType, setUploadType] = useState<'before' | 'after'>('before')
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
      .in('status', ['completed', 'reviewed'])
      .order('created_at', { ascending: false })
    if (data) setBookings(data)
    setPageLoading(false)
  }

  async function selectBooking(b: Booking) {
    setSelectedBooking(b)
    setFlaggedAreas([])
    setClientNotes('')
    setPreviewUrl(null)
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
      .order('created_at', { ascending: true })
    if (p) setPhotos(p)
  }

  async function handleUpload(file: File) {
    if (!selectedBooking || !supabase) return
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('booking_id', selectedBooking.id)
    formData.append('photo_type', uploadType)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPhotos(prev => [...prev, data])
      setPreviewUrl(null)
    } catch (err: any) {
      alert('Upload failed: ' + err.message)
    }
    setUploading(false)
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
      const res = await fetch('/api/stripe/escrow-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: selectedBooking.id }),
      })
      const data = await res.json()
      if (!data.success) {
        alert('Payment release failed: ' + (data.error || 'Unknown error'))
        return
      }
    } else {
      await supabase
        .from('bookings')
        .update({
          inspection_status: 'flagged',
          recovery_status: 'requested',
          recovery_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', selectedBooking.id)
    }

    setSelectedBooking(null)
    load()
  }

  const completed = tasks.filter(t => t.is_completed).length
  const total = tasks.length

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      approved: 'accent',
      flagged: 'danger',
      pending: 'warning',
    }
    return <Badge variant={(map[status] || 'ghost') as any}>{status}</Badge>
  }

  return (
    <div className="p-8">
      {pageLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton type="stats" />
          <LoadingSkeleton type="card" />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-bold text-foreground">Inspection Portal</h2>
            <p className="text-sm text-muted">Review completed work with before/after photos</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatsCard label="Completed Jobs" value={bookings.length} accent="white" />
            <StatsCard label="Pending Inspection" value={bookings.filter(b => b.inspection_status === 'pending').length} accent="warning" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <Card padding="sm" className="p-0 overflow-hidden animate-fade-in">
                {bookings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm"><p>No completed bookings</p></div>
                ) : (
                  <div className="divide-y divide-card-border">
                    {bookings.map(b => (
                      <button
                        key={b.id}
                        onClick={() => selectBooking(b)}
                        className={`w-full text-left p-3 hover:bg-surface-hover cursor-pointer ${selectedBooking?.id === b.id ? 'bg-surface-hover border-l-2 border-accent' : ''}`}
                      >
                        <div className="text-xs font-mono text-muted">{b.id.slice(0, 8)}</div>
                        <div className="text-sm font-semibold text-foreground">{fmtDate(b.scheduled_date)}</div>
                        <div className="text-xs text-muted-foreground">${b.amount.toFixed(0)}</div>
                        <div className="mt-1">{statusBadge(b.inspection_status)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="col-span-2">
              <Card padding="md" className="animate-fade-in">
                {!selectedBooking ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">
                    <ClipboardCheck size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Select a booking to inspect</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-foreground">Booking {selectedBooking.id.slice(0, 8)}</h3>
                        <p className="text-xs text-muted">{fmtDate(selectedBooking.scheduled_date)}</p>
                      </div>
                      {statusBadge(selectedBooking.inspection_status)}
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted">Task Completion</span>
                        <span className="font-semibold text-foreground">{completed}/{total}</span>
                      </div>
                      <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${completed === total ? 'bg-accent' : 'bg-warning'}`}
                          style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">Before & After Photos</h4>
                        {selectedBooking.inspection_status === 'pending' && (
                          <div className="flex gap-2 items-center">
                            <select
                              value={uploadType}
                              onChange={(e) => setUploadType(e.target.value as 'before' | 'after')}
                              className="px-2 py-1 bg-input border border-input-border rounded text-xs text-foreground"
                            >
                              <option value="before">Before</option>
                              <option value="after">After</option>
                            </select>
                            <Button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                              variant="primary"
                              size="sm"
                              icon={uploading ? undefined : Camera}
                            >
                              {uploading ? 'Uploading...' : 'Upload'}
                            </Button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  setPreviewUrl(URL.createObjectURL(file))
                                  handleUpload(file)
                                }
                                e.target.value = ''
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {photos.length === 0 && !previewUrl ? (
                        <div className="bg-surface rounded-lg p-4 text-center text-muted-foreground text-xs">
                          No photos uploaded yet
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {photos.map(p => (
                            <div key={p.id} className="group relative bg-surface rounded-lg overflow-hidden">
                              <img
                                src={p.url}
                                alt={`${p.photo_type} photo`}
                                className="w-full h-24 object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/60 text-white">
                                {p.photo_type}
                              </div>
                            </div>
                          ))}
                          {previewUrl && (
                            <div className="bg-surface rounded-lg overflow-hidden animate-pulse relative">
                              <img src={previewUrl} className="w-full h-24 object-cover opacity-50" alt="Uploading..." />
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] bg-black/60 text-warning">Uploading...</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Room-by-Room Tasks</h4>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {tasks.map(t => (
                          <div key={t.id} className={`flex items-center gap-2 text-xs p-1.5 rounded ${t.is_completed ? 'text-muted-foreground' : 'text-danger'}`}>
                            <span>{t.is_completed ? <CheckCircle size={12} /> : '○'}</span>
                            <span className="text-muted">{t.room}:</span>
                            <span className="text-foreground">{t.task}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedBooking.inspection_status === 'pending' && (
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Flag Missed Areas</h4>
                          <div className="flex flex-wrap gap-2">
                            {tasks.filter(t => !t.is_completed).map(t => (
                              <button
                                key={t.id}
                                onClick={() => setFlaggedAreas(prev => prev.includes(t.task) ? prev.filter(f => f !== t.task) : [...prev, t.task])}
                                className={`px-2 py-1 text-xs rounded border cursor-pointer ${
                                  flaggedAreas.includes(t.task)
                                    ? 'border-danger bg-danger-dim text-danger'
                                    : 'border-input-border text-muted hover:border-danger'
                                }`}
                              >
                                {t.task}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted block mb-1">Client Notes</label>
                          <textarea
                            value={clientNotes}
                            onChange={(e) => setClientNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-input-focus placeholder:text-muted-foreground"
                            placeholder="Describe any issues..."
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button onClick={() => submitInspection(true)} variant="primary" className="flex-1" icon={CheckCircle}>
                            Approve & Release Payment
                          </Button>
                          <Button onClick={() => submitInspection(false)} variant="danger" className="flex-1" icon={Flag}>
                            Flag Issues
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedBooking.inspection_status === 'approved' && (
                      <div className="bg-accent-dim border border-accent/20 rounded-lg p-3 text-sm text-accent text-center">
                        <CheckCircle size={16} className="inline mr-1" />
                        Approved — Payment released to cleaner
                      </div>
                    )}

                    {selectedBooking.inspection_status === 'flagged' && (
                      <div className="bg-danger-dim border border-danger/20 rounded-lg p-3 text-sm text-danger text-center">
                        <AlertTriangle size={16} className="inline mr-1" />
                        Issues flagged — Recovery workflow active (2h window)
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
