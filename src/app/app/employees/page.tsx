'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Employee, EmployeeWarning, ClockEvent } from '@/lib/supabase'
import LoadingSkeleton from '@/components/LoadingSkeleton'

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
      <span className="text-[#ffd700] text-xs">
        {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
      </span>
    )
  }

  function statusBadge(status: string) {
    const map: Record<string, { color: string; bg: string }> = {
      active: { color: 'text-[#00d28e]', bg: 'bg-[rgba(0,210,142,0.12)]' },
      suspended: { color: 'text-[#ffd700]', bg: 'bg-[rgba(255,215,0,0.12)]' },
      terminated: { color: 'text-[#ff5050]', bg: 'bg-[rgba(255,80,80,0.12)]' },
    }
    const s = map[status] || map.active
    return (
      <span className={`${s.color} ${s.bg} inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
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
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Employees</h2>
              <p className="text-sm text-[#888]">Workforce management</p>
            </div>
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg text-sm hover:bg-[#00e89c] transition-colors cursor-pointer"
            >
              + Add Employee
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <div className="text-xs text-[#888]">Total</div>
              <div className="text-2xl font-bold text-[#00d28e]">{employees.length}</div>
            </div>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <div className="text-xs text-[#888]">Active</div>
              <div className="text-2xl font-bold text-white">{employees.filter((e) => e.status === 'active').length}</div>
            </div>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <div className="text-xs text-[#888]">On Job</div>
              <div className="text-2xl font-bold text-[#ffd700]">{onJob}</div>
            </div>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <div className="text-xs text-[#888]">Terminated</div>
              <div className="text-2xl font-bold text-[#ff5050]">{employees.filter((e) => e.status === 'terminated').length}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            {['all', 'active', 'suspended', 'terminated'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filter === f
                    ? 'bg-[#00d28e] text-[#0a0a0a]'
                    : 'bg-[#1a1a1a] text-[#888] hover:bg-[#2a2a2a]'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <div className="ml-auto">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees..."
                className="w-56 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-[#555]">
              <p>No employees found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {filtered.map((e) => (
                <div
                  key={e.id}
                  onClick={() => router.push(`/app/employees/${e.id}`)}
                  className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 hover:border-[#333] transition-colors cursor-pointer relative"
                >
                  {hasWarnings(e) && (
                    <span className="absolute top-3 right-3 bg-[#ff5050] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      ⚠
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#00d28e]/20 flex items-center justify-center text-[#00d28e] font-bold text-sm">
                      {e.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{e.name}</div>
                      <div className="text-xs text-[#888] truncate">{e.role || '—'}</div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-[#888] mb-3">
                    {e.email && <div>✉ {e.email}</div>}
                    {e.phone && <div>📞 {e.phone}</div>}
                  </div>
                  <div className="flex items-center justify-between">
                    {statusBadge(e.status)}
                    <div className="text-right">
                      <div className="text-xs text-[#888]">{renderStars(e.rating)}</div>
                      <div className="text-[10px] text-[#555]">{e.total_jobs} jobs</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
              <div className="bg-[#141414] border border-[#222] rounded-2xl p-7 w-[480px] max-w-[94vw] max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-bold text-[#00d28e] mb-5">{editId ? 'Edit' : 'Add'} Employee</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-[#aaa] block mb-1">Full Name</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[#aaa] block mb-1">Email</label>
                      <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#aaa] block mb-1">Phone</label>
                      <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#aaa] block mb-1">Role</label>
                    <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#aaa] block mb-1">Pay Type</label>
                    <select value={form.pay_type} onChange={(e) => setForm({ ...form, pay_type: e.target.value as any })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]">
                      <option value="hourly">Hourly</option>
                      <option value="per_job">Per Job</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[#aaa] block mb-1">Hourly Rate ($)</label>
                      <input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#aaa] block mb-1">Per Job Rate ($)</label>
                      <input type="number" value={form.per_job_rate} onChange={(e) => setForm({ ...form, per_job_rate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#aaa] block mb-1">Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]">
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#aaa] block mb-1">Skills (comma-separated)</label>
                    <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="e.g. Plumbing, Electrical, HVAC" className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#aaa] block mb-1">Notes</label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e] resize-none h-20" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-[#1a1a1a] text-sm rounded-lg hover:bg-[#2a2a2a] cursor-pointer">Cancel</button>
                  <button onClick={save} className="px-4 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold text-sm rounded-lg hover:bg-[#00e89c] cursor-pointer">{editId ? 'Update' : 'Add Employee'}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
