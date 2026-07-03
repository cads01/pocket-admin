'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter, useParams } from 'next/navigation'
import type { Employee, EmployeeWarning, ClockEvent, PayrollRecord } from '@/lib/supabase'
import LoadingSkeleton from '@/components/LoadingSkeleton'

export default function EmployeeDetailPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const params = useParams()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [warnings, setWarnings] = useState<EmployeeWarning[]>([])
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([])
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    loadData()
  }, [user, loading])

  async function loadData() {
    if (!supabase) return
    const id = params.id as string
    setPageLoading(true)

    const [empRes, warnRes, clockRes, payRes] = await Promise.all([
      supabase.from('employees').select('*').eq('id', id).single(),
      supabase.from('employee_warnings').select('*').eq('employee_id', id).order('created_at', { ascending: false }),
      supabase.from('clock_events').select('*').eq('employee_id', id).order('clock_in', { ascending: false }).limit(20),
      supabase.from('payroll_records').select('*').eq('employee_id', id).order('period_start', { ascending: false }).limit(12),
    ])

    if (empRes.data) setEmployee(empRes.data)
    if (warnRes.data) setWarnings(warnRes.data)
    if (clockRes.data) setClockEvents(clockRes.data)
    if (payRes.data) setPayrollRecords(payRes.data)
    setPageLoading(false)
  }

  async function acknowledgeWarning(id: string) {
    if (!supabase) return
    await supabase.from('employee_warnings').update({ acknowledged: true }).eq('id', id)
    setWarnings((prev) =>
      prev.map((w) => (w.id === id ? { ...w, acknowledged: true } : w))
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

  function severityBadge(severity: string) {
    return severity === 'red'
      ? 'bg-[rgba(255,80,80,0.12)] text-[#ff5050]'
      : 'bg-[rgba(255,215,0,0.12)] text-[#ffd700]'
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function formatTime(d: string) {
    return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  function formatDuration(min: number) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  function renderStars(rating: number) {
    const full = Math.floor(rating)
    const half = rating - full >= 0.5
    return (
      <span className="text-[#ffd700]">
        {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
      </span>
    )
  }

  if (pageLoading) {
    return (
      <div className="p-8 space-y-6">
        <LoadingSkeleton type="text" />
        <LoadingSkeleton type="stats" />
        <LoadingSkeleton type="card" />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="p-8 text-center text-[#555]">
        <p>Employee not found.</p>
      </div>
    )
  }

  const statCards = [
    { label: 'Rating', value: employee.rating.toFixed(1), extra: renderStars(employee.rating), color: 'text-[#ffd700]' },
    { label: 'Completion Rate', value: `${(employee.completion_rate * 100).toFixed(0)}%`, color: 'text-[#00d28e]' },
    { label: 'Punctuality', value: `${(employee.punctuality_score * 100).toFixed(0)}%`, color: 'text-[#00d28e]' },
    { label: 'Missed Jobs', value: employee.missed_jobs, color: employee.missed_jobs > 3 ? 'text-[#ff5050]' : 'text-white' },
    { label: 'Total Jobs', value: employee.total_jobs, color: 'text-white' },
    { label: 'Tenure', value: formatDate(employee.hire_date), color: 'text-[#888]' },
  ]

  return (
    <div className="p-8">
      <button
        onClick={() => router.push('/app/employees')}
        className="flex items-center gap-1.5 text-sm text-[#888] hover:text-white mb-4 transition-colors cursor-pointer"
      >
        ← Back to Employees
      </button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#00d28e]/20 flex items-center justify-center text-[#00d28e] font-bold text-xl">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{employee.name}</h1>
              {statusBadge(employee.status)}
            </div>
            <p className="text-sm text-[#888]">
              {employee.role || '—'} · {employee.pay_type === 'hourly' ? `$${employee.hourly_rate}/hr` : employee.pay_type === 'per_job' ? `$${employee.per_job_rate}/job` : `$${employee.hourly_rate}/hr + $${employee.per_job_rate}/job`}
            </p>
          </div>
        </div>
        <div className="text-right text-sm text-[#555]">
          <div>Hired {formatDate(employee.hire_date)}</div>
          {employee.email && <div>{employee.email}</div>}
          {employee.phone && <div>{employee.phone}</div>}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
            <div className="text-xs text-[#888] mb-1">{s.label}</div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            {s.extra && <div className="mt-0.5">{s.extra}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888] mb-2">Hourly Rate</div>
          <div className="text-lg font-bold text-white">${employee.hourly_rate.toFixed(2)}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888] mb-2">Per Job Rate</div>
          <div className="text-lg font-bold text-white">${employee.per_job_rate.toFixed(2)}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888] mb-2">Pay Type</div>
          <div className="text-lg font-bold text-[#00d28e] capitalize">{employee.pay_type.replace('_', ' / ')}</div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-4">⚠ Early Warnings</h3>
          <div className="space-y-2">
            {warnings.map((w) => (
              <div
                key={w.id}
                className={`bg-[#111] border border-[#1a1a1a] rounded-xl p-4 flex items-center justify-between ${
                  !w.acknowledged ? 'border-l-2 border-l-[#ff5050]' : 'opacity-60'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${severityBadge(w.severity)}`}>
                      {w.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#555] capitalize">{w.warning_type.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-[#555]">{formatDate(w.created_at)}</span>
                  </div>
                  <p className="text-sm">{w.message}</p>
                </div>
                {!w.acknowledged && (
                  <button
                    onClick={() => acknowledgeWarning(w.id)}
                    className="ml-4 px-3 py-1.5 bg-[#00d28e] text-[#0a0a0a] text-xs font-semibold rounded-lg hover:bg-[#00e89c] cursor-pointer whitespace-nowrap"
                  >
                    Acknowledge
                  </button>
                )}
                {w.acknowledged && (
                  <span className="ml-4 text-xs text-[#555]">Acknowledged</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
          <h3 className="text-lg font-bold mb-4">Clock History</h3>
          {clockEvents.length === 0 ? (
            <p className="text-sm text-[#555] py-4 text-center">No clock events recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#888] text-xs uppercase tracking-wide border-b border-[#1a1a1a]">
                    <th className="text-left py-2 pr-3">Date</th>
                    <th className="text-left py-2 pr-3">Clock In</th>
                    <th className="text-left py-2 pr-3">Clock Out</th>
                    <th className="text-right py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {clockEvents.map((ce) => (
                    <tr key={ce.id} className="border-b border-[#151515]">
                      <td className="py-2 pr-3 text-[#888]">{formatDate(ce.clock_in)}</td>
                      <td className="py-2 pr-3">{formatTime(ce.clock_in)}</td>
                      <td className="py-2 pr-3">{ce.clock_out ? formatTime(ce.clock_out) : <span className="text-[#00d28e]">Active</span>}</td>
                      <td className="py-2 text-right">{ce.duration_minutes ? formatDuration(ce.duration_minutes) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
          <h3 className="text-lg font-bold mb-4">Payroll History</h3>
          {payrollRecords.length === 0 ? (
            <p className="text-sm text-[#555] py-4 text-center">No payroll records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#888] text-xs uppercase tracking-wide border-b border-[#1a1a1a]">
                    <th className="text-left py-2 pr-3">Period</th>
                    <th className="text-right py-2 pr-3">Hours</th>
                    <th className="text-right py-2 pr-3">Jobs</th>
                    <th className="text-right py-2 pr-3">Earnings</th>
                    <th className="text-right py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRecords.map((pr) => (
                    <tr key={pr.id} className="border-b border-[#151515]">
                      <td className="py-2 pr-3 text-[#888] text-xs">
                        {formatDate(pr.period_start)} – {formatDate(pr.period_end)}
                      </td>
                      <td className="py-2 pr-3 text-right">{pr.hours_worked.toFixed(1)}</td>
                      <td className="py-2 pr-3 text-right">{pr.jobs_completed}</td>
                      <td className="py-2 pr-3 text-right font-medium text-[#00d28e]">${pr.total_earnings.toFixed(2)}</td>
                      <td className="py-2 text-right">
                        <span className={`text-xs font-semibold ${pr.status === 'paid' ? 'text-[#00d28e]' : 'text-[#ffd700]'}`}>
                          {pr.status === 'paid' ? 'Paid' : 'Pending'}
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

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
          <h3 className="text-lg font-bold mb-3">Skills</h3>
          {employee.skills && employee.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {employee.skills.map((s, i) => (
                <span key={i} className="px-2.5 py-1 bg-[rgba(0,210,142,0.12)] text-[#00d28e] text-xs rounded-lg">
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#555]">No skills listed.</p>
          )}
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
          <h3 className="text-lg font-bold mb-3">Certifications</h3>
          {employee.certifications && employee.certifications.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {employee.certifications.map((c, i) => (
                <span key={i} className="px-2.5 py-1 bg-[rgba(255,215,0,0.12)] text-[#ffd700] text-xs rounded-lg">
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#555]">No certifications listed.</p>
          )}
        </div>
      </div>

      {employee.notes && (
        <div className="mt-6 bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
          <h3 className="text-lg font-bold mb-2">Notes</h3>
          <p className="text-sm text-[#aaa] whitespace-pre-wrap">{employee.notes}</p>
        </div>
      )}
    </div>
  )
}
