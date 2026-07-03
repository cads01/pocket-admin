'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Employee } from '@/lib/supabase'
import CleanerMap from '@/components/CleanerMap'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
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
import { Sparkles, Edit3, Plus, Search, User, Mail, Phone, MapPin, DollarSign, Star, Trash2, X, Check } from 'lucide-react'

interface EmployeeLocation {
  employee_id: string
  latitude: number
  longitude: number
  updated_at: string
}

export default function EmployeesPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [employees, setEmployees] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [locations, setLocations] = useState<Map<string, EmployeeLocation>>(new Map())
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return
    loadLocations()

    const channel = supabase
      .channel('employee-locations-page')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'employee_locations' },
        (payload: RealtimePostgresChangesPayload<EmployeeLocation>) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const r = payload.new as EmployeeLocation
            setLocations((prev) => {
              const next = new Map(prev)
              next.set(r.employee_id, r)
              return next
            })
          }
          if (payload.eventType === 'DELETE') {
            const r = payload.old as EmployeeLocation
            setLocations((prev) => {
              const next = new Map(prev)
              next.delete(r.employee_id)
              return next
            })
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [supabase])

  async function loadLocations() {
    if (!supabase) return
    const { data: locs } = await supabase.from('employee_locations').select('*')
    if (locs) {
      const map = new Map<string, EmployeeLocation>()
      for (const loc of locs) map.set(loc.employee_id, loc)
      setLocations(map)
    }
  }

  const [form, setForm] = useState({
    name: '',
    business: '',
    phone: '',
    email: '',
    bio: '',
    services: 'standard',
    active: true,
    verified: false,
  })

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    loadEmployees()
  }, [user, loading])

  async function loadEmployees() {
    if (!supabase) return
    setPageLoading(true)
    const { data } = await supabase.from('employees').select('*')
    if (data) setEmployees(data)
    setPageLoading(false)
  }

  function openAdd() {
    setEditId(null)
    setForm({ name: '', business: '', phone: '', email: '', bio: '', services: 'standard', active: true, verified: false })
    setShowModal(true)
  }

  function openEdit(c: any) {
    setEditId(c.id)
    setForm({
      name: c.name || '',
      business: c.business || '',
      phone: c.phone || '',
      email: c.email || '',
      bio: c.bio || '',
      services: c.services?.[0] || 'standard',
      active: c.active,
      verified: c.verified,
    })
    setShowModal(true)
  }

  async function save() {
    if (!supabase) return
    if (!form.name) return
    if (editId) {
      await supabase.from('employees').update({
        name: form.name,
        email: form.email,
        phone: form.phone,
        business: form.business,
        bio: form.bio,
        services: [form.services],
        active: form.active,
        verified: form.verified,
      }).eq('id', editId)
    } else {
      await supabase.from('employees').insert({
        name: form.name,
        email: form.email,
        phone: form.phone,
        business: form.business,
        bio: form.bio,
        services: [form.services],
        active: form.active,
        verified: form.verified,
      })
    }
    await loadEmployees()
    setShowModal(false)
  }

  async function toggleActive(id: string, current: boolean) {
    if (!supabase) return
    await supabase.from('employees').update({ active: !current }).eq('id', id)
    await loadEmployees()
  }

  async function toggleVerify(id: string, current: boolean) {
    if (!supabase) return
    await supabase.from('employees').update({ verified: !current }).eq('id', id)
    await loadEmployees()
  }

  const active = employees.filter((c) => c.active).length
  const verified = employees.filter((c) => c.verified).length

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (c: any) => <span className="font-medium">{c.name || '—'}</span>,
    },
    {
      key: 'business',
      label: 'Business',
      render: (c: any) => <span className="text-muted">{c.business || '—'}</span>,
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (c: any) => <span className="text-muted">{c.phone || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (c: any) => (
        <div className="flex items-center gap-1">
          <StatusBadge status={c.active ? 'active' : 'suspended'} />
          {c.verified ? (
            <Check size={14} className="text-accent" />
          ) : (
            <Button variant="ghost" size="sm" onClick={() => toggleVerify(c.id, c.verified)}>
              ○
            </Button>
          )}
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (c: any) => {
        const loc = locations.get(c.id)
        const recent = loc && Date.now() - new Date(loc.updated_at).getTime() < 5 * 60 * 1000
        return recent ? (
          <span className="flex items-center gap-1.5" title={`${loc!.latitude.toFixed(4)}, ${loc!.longitude.toFixed(4)}`}>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-accent text-xs font-medium">Live</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted" />
            <span className="text-muted text-xs">Offline</span>
          </span>
        )
      },
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (c: any) => <span className="text-warning">{c.rating?.toFixed(1) || '—'}</span>,
    },
    {
      key: 'jobs',
      label: 'Jobs',
      render: (c: any) => c.completed_jobs || 0,
    },
    {
      key: 'earnings',
      label: 'Earnings',
      render: (c: any) => `$${(c.total_earnings || 0).toFixed(0)}`,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (c: any) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
            <Edit3 size={14} />
          </Button>
          <Button
            variant={c.active ? 'danger' : 'ghost'}
            size="sm"
            onClick={() => toggleActive(c.id, c.active)}
          >
            {c.active ? '⛔' : '✅'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      {pageLoading ? (
        <div className="space-y-6 animate-fade-in">
          <LoadingSkeleton type="stats" />
          <LoadingSkeleton type="table" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 md:mb-6 animate-fade-in">
            <div>
              <h2 className="text-lg md:text-xl font-bold">Employees</h2>
              <p className="text-sm text-muted">Service providers on the platform</p>
            </div>
            <Button onClick={openAdd} icon={Plus}>Add Employee</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 md:mb-6 animate-fade-in">
            <StatsCard label="Total" value={employees.length} accent="accent" />
            <StatsCard label="Active" value={active} accent="white" />
            <StatsCard label="Verified" value={verified} accent="warning" />
            <StatsCard
              label="Earnings"
              value={`$${employees.reduce((s, c) => s + (c.total_earnings || 0), 0).toFixed(0)}`}
              accent="white"
            />
          </div>

          <CleanerMap />

          <Card variant="default" padding="sm" className="overflow-x-auto animate-fade-in">
            <div className="min-w-[600px]">
            <Table
              columns={columns}
              data={employees}
              emptyState={
                <EmptyState
                  icon={<Sparkles size={48} className="text-muted" />}
                  title="No employees yet"
                  description="Add your first employee to get started!"
                  action={{ label: 'Add Employee', onClick: openAdd }}
                />
              }
            />
            </div>
          </Card>

          <Modal
            open={showModal}
            onClose={() => setShowModal(false)}
            title={`${editId ? 'Edit' : 'Add'} Employee`}
          >
            <div className="space-y-3">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Business Name"
                value={form.business}
                onChange={(e) => setForm({ ...form, business: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <Input
                  label="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Bio / Services</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-input-focus resize-none h-20 placeholder:text-muted-foreground"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Services</label>
                  <select
                    value={form.services}
                    onChange={(e) => setForm({ ...form, services: e.target.value })}
                    className="w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-input-focus"
                  >
                    <option value="standard">Standard Clean</option>
                    <option value="deep">Deep Clean</option>
                    <option value="move">Move-Out/In</option>
                    <option value="all">All Services</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
                  <select
                    value={form.active ? 'active' : 'suspended'}
                    onChange={(e) => setForm({ ...form, active: e.target.value === 'active' })}
                    className="w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-input-focus"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={form.verified}
                  onChange={(e) => setForm({ ...form, verified: e.target.checked })}
                  className="accent-accent"
                />
                Verified (official registration)
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={save}>{editId ? 'Update' : 'Add Employee'}</Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  )
}
