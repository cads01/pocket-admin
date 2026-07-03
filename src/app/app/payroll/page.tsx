'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { fmtDate } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import type { PayrollRecord, Employee } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import StatsCard from '@/components/ui/StatsCard'
import StatusBadge from '@/components/ui/StatusBadge'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import EmptyState from '@/components/ui/EmptyState'
import Input from '@/components/ui/Input'
import { DollarSign } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'

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
  const { success, error } = useToast()
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
    try {
      await supabase
        .from('payroll_records')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id)
      await load()
      success('Payroll marked as paid')
    } catch {
      error('Failed to mark as paid')
    }
  }

  async function generatePayroll() {
    if (!supabase) return
    setGenerating(true)
    try {
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
      success('Payroll generated')
    } catch {
      error('Failed to generate payroll')
      setGenerating(false)
    }
  }

  const pendingTotal = records.filter(r => r.status === 'pending').reduce((s, r) => s + r.total_earnings, 0)
  const paidTotal = records.filter(r => r.status === 'paid').reduce((s, r) => s + r.total_earnings, 0)

  const columns = [
    { key: 'employee', label: 'Employee', render: (r: PayrollWithEmployee) => r.employees?.name || r.employee_id.slice(0, 8) },
    { key: 'hours', label: 'Hours', render: (r: PayrollWithEmployee) => r.hours_worked.toFixed(1) },
    { key: 'jobs', label: 'Jobs', render: (r: PayrollWithEmployee) => r.jobs_completed.toString() },
    { key: 'hourly', label: 'Hourly', render: (r: PayrollWithEmployee) => `$${r.hourly_earnings.toFixed(2)}` },
    { key: 'per_job', label: 'Per Job', render: (r: PayrollWithEmployee) => `$${r.per_job_earnings.toFixed(2)}` },
    { key: 'total', label: 'Total', render: (r: PayrollWithEmployee) => <span className="font-semibold">${r.total_earnings.toFixed(2)}</span> },
    { key: 'status', label: 'Status', render: (r: PayrollWithEmployee) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: 'Actions', render: (r: PayrollWithEmployee) => r.status === 'pending' ? <Button variant="ghost" size="sm" onClick={() => markPaid(r.id)}>Mark as Paid</Button> : null },
  ]

  return (
    <div className="p-4 md:p-6">
      {pageLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton type="stats" />
          <LoadingSkeleton type="table" />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-foreground">Payroll</h2>
              <p className="text-sm text-muted">Auto-calculated earnings per employee</p>
            </div>
            <Button
              onClick={generatePayroll}
              disabled={generating || (period === 'custom' && (!customStart || !customEnd))}
              loading={generating}
            >
              Generate Payroll
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard label="Total Pending" value={`$${pendingTotal.toFixed(0)}`} accent="warning" />
            <StatsCard label="Total Paid" value={`$${paidTotal.toFixed(0)}`} accent="accent" />
            <StatsCard
              label="This Period"
              value={period === 'custom'
                ? `${customStart || '?'} – ${customEnd || '?'}`
                : period === 'this-week' ? 'This Week'
                : period === 'this-month' ? 'This Month'
                : 'Last Month'}
              accent="white"
            />
            <StatsCard label="Employees" value={employees.length} accent="white" />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-input-focus"
            >
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="custom">Custom</option>
            </select>
            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-40" />
                <span className="text-muted">to</span>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-40" />
              </div>
            )}
          </div>

          <Card padding="sm" className="p-0 overflow-x-auto animate-fade-in">
            <div className="min-w-[600px]">
            <Table
              columns={columns}
              data={records}
              emptyState={
                <EmptyState
                  icon={<DollarSign size={32} />}
                  title="No payroll records yet"
                  description='Click "Generate Payroll" to create records for the current period'
                />
              }
            />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
