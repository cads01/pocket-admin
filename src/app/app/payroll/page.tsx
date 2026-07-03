'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { fmtDate } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import type { PayrollRecord, Employee } from '@/lib/supabase'

type PayrollWithEmployee = PayrollRecord & { employees: { name: string } | null }

function getPeriodRange(period: string): { start: string; end: string } {
  const now = new Date()
  if (period === 'this-week') {
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
  }
  if (period === 'this-month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
  }
  if (period === 'last-month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
  }
  return { start: '', end: '' }
}

export default function PayrollPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [records, setRecords] = useState<PayrollWithEmployee[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [period, setPeriod] = useState('this-month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    load()
  }, [user, loading, period, customStart, customEnd])

  async function load() {
    if (!supabase) return
    setPageLoading(true)

    const { data: recs } = await supabase
      .from('payroll_records')
      .select('*, employees(name)')
      .order('created_at', { ascending: false })
    if (recs) setRecords(recs as unknown as PayrollWithEmployee[])

    const { data: emps } = await supabase.from('employees').select('*').eq('status', 'active')
    if (emps) setEmployees(emps)

    setPageLoading(false)
  }

  async function markPaid(id: string) {
    if (!supabase) return
    await supabase
      .from('payroll_records')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id)
    await load()
  }

  async function generatePayroll() {
    if (!supabase) return
    setGenerating(true)

    const range = period === 'custom'
      ? { start: customStart, end: customEnd }
      : getPeriodRange(period)
    if (!range.start || !range.end) { setGenerating(false); return }

    const { data: emps } = await supabase.from('employees').select('*').eq('status', 'active')
    if (!emps) { setGenerating(false); return }

    const inserts: any[] = []
    for (const emp of emps) {
      const { data: events } = await supabase
        .from('clock_events')
        .select('*')
        .eq('employee_id', emp.id)
        .gte('clock_in', range.start + 'T00:00:00')
        .lte('clock_in', range.end + 'T23:59:59')

      if (!events) continue

      let totalMinutes = 0
      const jobIds = new Set<string>()
      for (const e of events) {
        if (e.duration_minutes) totalMinutes += e.duration_minutes
        if (e.booking_id) jobIds.add(e.booking_id)
      }

      const hoursWorked = Math.round((totalMinutes / 60) * 100) / 100
      const jobsCompleted = jobIds.size
      const hourlyEarnings = Math.round(hoursWorked * emp.hourly_rate * 100) / 100
      const perJobEarnings = Math.round(jobsCompleted * emp.per_job_rate * 100) / 100
      const totalEarnings = Math.round((hourlyEarnings + perJobEarnings) * 100) / 100

      if (totalEarnings > 0) {
        inserts.push({
          employee_id: emp.id,
          period_start: range.start,
          period_end: range.end,
          hours_worked: hoursWorked,
          jobs_completed: jobsCompleted,
          hourly_earnings: hourlyEarnings,
          per_job_earnings: perJobEarnings,
          total_earnings: totalEarnings,
          status: 'pending',
        })
      }
    }

    if (inserts.length > 0) {
      await supabase.from('payroll_records').insert(inserts)
    }

    setGenerating(false)
    await load()
  }

  const pendingTotal = records.filter(r => r.status === 'pending').reduce((s, r) => s + r.total_earnings, 0)
  const paidTotal = records.filter(r => r.status === 'paid').reduce((s, r) => s + r.total_earnings, 0)

  return (
    <div className="p-8">
      {pageLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton type="stats" />
          <LoadingSkeleton type="table" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Payroll</h2>
              <p className="text-sm text-[#888]">Auto-calculated earnings per employee</p>
            </div>
            <button
              onClick={generatePayroll}
              disabled={generating || (period === 'custom' && (!customStart || !customEnd))}
              className="px-4 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg text-sm disabled:opacity-50 cursor-pointer"
            >
              {generating ? 'Generating...' : 'Generate Payroll'}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <div className="text-xs text-[#888]">Total Pending</div>
              <div className="text-2xl font-bold text-[#ffd700]">${pendingTotal.toFixed(0)}</div>
            </div>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <div className="text-xs text-[#888]">Total Paid</div>
              <div className="text-2xl font-bold text-[#00d28e]">${paidTotal.toFixed(0)}</div>
            </div>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <div className="text-xs text-[#888]">This Period</div>
              <div className="text-2xl font-bold">
                {period === 'custom'
                  ? `${customStart || '?'} – ${customEnd || '?'}`
                  : period === 'this-week' ? 'This Week'
                  : period === 'this-month' ? 'This Month'
                  : 'Last Month'}
              </div>
            </div>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <div className="text-xs text-[#888]">Employees</div>
              <div className="text-2xl font-bold">{employees.length}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
            >
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="custom">Custom</option>
            </select>
            {period === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                />
                <span className="text-[#555]">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                />
              </>
            )}
          </div>

          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
            {records.length === 0 ? (
              <div className="text-center py-16 text-[#555]">
                <div className="text-4xl mb-3 opacity-30">💰</div>
                <p>No payroll records yet</p>
                <p className="text-xs mt-1">Click "Generate Payroll" to create records for the current period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#888] text-xs uppercase tracking-wide border-b border-[#1a1a1a]">
                      <th className="text-left py-3 px-4">Employee</th>
                      <th className="text-left py-3 px-4">Hours</th>
                      <th className="text-left py-3 px-4">Jobs</th>
                      <th className="text-left py-3 px-4">Hourly</th>
                      <th className="text-left py-3 px-4">Per Job</th>
                      <th className="text-left py-3 px-4">Total</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} className="border-b border-[#151515] hover:bg-[#0f0f0f]">
                        <td className="py-3 px-4 font-medium">{r.employees?.name || r.employee_id.slice(0, 8)}</td>
                        <td className="py-3 px-4">{r.hours_worked.toFixed(1)}</td>
                        <td className="py-3 px-4">{r.jobs_completed}</td>
                        <td className="py-3 px-4">${r.hourly_earnings.toFixed(2)}</td>
                        <td className="py-3 px-4">${r.per_job_earnings.toFixed(2)}</td>
                        <td className="py-3 px-4 font-semibold">${r.total_earnings.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            r.status === 'paid'
                              ? 'bg-[rgba(0,210,142,0.12)] text-[#00d28e]'
                              : 'bg-[rgba(255,215,0,0.12)] text-[#ffd700]'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {r.status === 'pending' && (
                            <button
                              onClick={() => markPaid(r.id)}
                              className="px-3 py-1 text-xs bg-[rgba(0,210,142,0.12)] text-[#00d28e] rounded-md hover:bg-[rgba(0,210,142,0.2)] cursor-pointer"
                            >
                              Mark as Paid
                            </button>
                          )}
                        </td>
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
