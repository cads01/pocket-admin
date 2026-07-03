'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Employee, EmployeeWarning, ClockEvent } from '@/lib/supabase'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Card from '@/components/ui/Card'
import StatsCard from '@/components/ui/StatsCard'
import StatusBadge from '@/components/ui/StatusBadge'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { Users, AlertTriangle, Mail, Phone, Search, UserPlus } from 'lucide-react'

interface EmployeeWithWarnings extends Employee {
  employee_warnings: EmployeeWarning[]
  clock_events: ClockEvent[]
}

export default function EmployeesPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [employees, setEmployees] = useState<EmployeeWithWarnings[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    pay_type: 'hourly' as 'hourly' | 'per_job' | 'both',
    hourly_rate: 0,
    per_job_rate: 0,
    status: 'active' as 'active' | 'suspended' | 'terminated',
    skills: '',
    notes: '',
  })

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    loadEmployees()
  }, [user, loading])

  async function loadEmployees() {
    if (!supabase) return
    setPageLoading(true)
    const { data } = await supabase
      .from('employees')
      .select('*, employee_warnings(*), clock_events(*)')
      .order('created_at', { ascending: false })
    if (data) setEmployees(data as EmployeeWithWarnings[])
    setPageLoading(false)
  }

  function openAdd() {
    setEditId(null)
    setForm({ name: '', email: '', phone: '', role: '', pay_type: 'hourly', hourly_rate: 0, per_job_rate: 0, status: 'active', skills: '', notes: '' })
    setShowModal(true)
  }

  function openEdit(e: EmployeeWithWarnings) {
    setEditId(e.id)
    setForm({
      name: e.name,
      email: e.email || '',
      phone: e.phone || '',
      role: e.role || '',
      pay_type: e.pay_type,
      hourly_rate: e.hourly_rate,
      per_job_rate: e.per_job_rate,
      status: e.status,
      skills: (e.skills || []).join(', '),
      notes: e.notes || '',
    })
    setShowModal(true)
  }

  async function save() {
    if (!supabase) return
    if (!form.name) return
    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      role: form.role || null,
      pay_type: form.pay_type,
      hourly_rate: form.hourly_rate,
      per_job_rate: form.per_job_rate,
      status: form.status,
      skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      notes: form.notes || null,
    }
    if (editId) {
      await supabase.from('employees').update(payload).eq('id', editId)
    } else {
      await supabase.from('employees').insert(payload)
    }
    await loadEmployees()
    setShowModal(false)
  }

  const onJob = employees.filter((e) =>
    e.clock_events?.some((ce) => ce.clock_in && !ce.clock_out)
  ).length

  const hasWarnings = (e: EmployeeWithWarnings) =>
    e.employee_warnings?.some((w) => !w.acknowledged)

  const filtered = employees.filter((e) => {
    const matchFilter = filter === 'all' || e.status === filter
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  function renderStars(rating: number) {
    const full = Math.floor(rating)
    const half = rating - full >= 0.5
    return (
      <span className="text-warning text-xs">
        {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
      </span>
    )
  }

  return (
    <div className="p-8">
      {pageLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton type="stats" />
          <LoadingSkeleton type="card" />
          <LoadingSkeleton type="card" />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Employees</h2>
              <p className="text-sm text-muted">Workforce management</p>
            </div>
            <Button onClick={openAdd} icon={UserPlus}>
              Add Employee
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <StatsCard label="Total" value={employees.length} accent="accent" />
            <StatsCard label="Active" value={employees.filter((e) => e.status === 'active').length} accent="white" />
            <StatsCard label="On Job" value={onJob} accent="warning" />
            <StatsCard label="Terminated" value={employees.filter((e) => e.status === 'terminated').length} accent="danger" />
          </div>

          <div className="flex items-center gap-3">
            {['all', 'active', 'suspended', 'terminated'].map((f) => (
              <Button
                key={f}
                onClick={() => setFilter(f)}
                variant={filter === f ? 'primary' : 'secondary'}
                size="sm"
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
            <div className="ml-auto">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees..."
                icon={Search}
                className="w-56"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users size={32} />}
              title="No employees found"
              description="Try adjusting your filters or search query"
            />
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {filtered.map((e) => (
                <Card
                  key={e.id}
                  variant="interactive"
                  padding="md"
                  onClick={() => router.push(`/app/employees/${e.id}`)}
                  className="relative"
                >
                  {hasWarnings(e) && (
                    <Badge variant="danger" className="absolute top-3 right-3">
                      <AlertTriangle size={10} />
                    </Badge>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-accent-dim flex items-center justify-center text-accent font-bold text-sm">
                      {e.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate text-foreground">{e.name}</div>
                      <div className="text-xs text-muted truncate">{e.role || '—'}</div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted mb-3">
                    {e.email && <div className="flex items-center gap-1.5"><Mail size={12} />{e.email}</div>}
                    {e.phone && <div className="flex items-center gap-1.5"><Phone size={12} />{e.phone}</div>}
                  </div>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={e.status} />
                    <div className="text-right">
                      <div className="text-xs text-muted">{renderStars(e.rating)}</div>
                      <div className="text-[10px] text-muted-foreground">{e.total_jobs} jobs</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

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
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <Input
                label="Role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
              <div>
                <label className="text-xs font-medium text-muted block mb-1">Pay Type</label>
                <select
                  value={form.pay_type}
                  onChange={(e) => setForm({ ...form, pay_type: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-input-focus"
                >
                  <option value="hourly">Hourly</option>
                  <option value="per_job">Per Job</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Hourly Rate ($)"
                  type="number"
                  value={form.hourly_rate}
                  onChange={(e) => setForm({ ...form, hourly_rate: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Per Job Rate ($)"
                  type="number"
                  value={form.per_job_rate}
                  onChange={(e) => setForm({ ...form, per_job_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted block mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-input-focus"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
              <Input
                label="Skills (comma-separated)"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="e.g. Plumbing, Electrical, HVAC"
              />
              <div>
                <label className="text-xs font-medium text-muted block mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-input-focus resize-none h-20 placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={save}>{editId ? 'Update' : 'Add Employee'}</Button>
            </div>
          </Modal>
        </div>
      )}
    </div>
  )
}
