'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter, useParams } from 'next/navigation'
import type { Employee, EmployeeWarning, ClockEvent, PayrollRecord } from '@/lib/supabase'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Card from '@/components/ui/Card'
import StatsCard from '@/components/ui/StatsCard'
import StatusBadge from '@/components/ui/StatusBadge'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import EmptyState from '@/components/ui/EmptyState'
import { ArrowLeft, Clock, DollarSign, Star, AlertTriangle } from 'lucide-react'

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
      <span className="text-warning">
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
      <div className="p-8 text-center text-muted-foreground">
        <p>Employee not found.</p>
      </div>
    )
  }

  const clockColumns = [
    { key: 'date', label: 'Date', render: (ce: ClockEvent) => <span className="text-muted">{formatDate(ce.clock_in)}</span> },
    { key: 'clock_in', label: 'Clock In', render: (ce: ClockEvent) => formatTime(ce.clock_in) },
    { key: 'clock_out', label: 'Clock Out', render: (ce: ClockEvent) => ce.clock_out ? formatTime(ce.clock_out) : <span className="text-accent">Active</span> },
    { key: 'duration', label: 'Duration', render: (ce: ClockEvent) => <div className="text-right">{ce.duration_minutes ? formatDuration(ce.duration_minutes) : '—'}</div> },
  ]

  const payrollColumns = [
    { key: 'period', label: 'Period', render: (pr: PayrollRecord) => <span className="text-muted text-xs">{formatDate(pr.period_start)} – {formatDate(pr.period_end)}</span> },
    { key: 'hours', label: 'Hours', render: (pr: PayrollRecord) => <div className="text-right">{pr.hours_worked.toFixed(1)}</div> },
    { key: 'jobs', label: 'Jobs', render: (pr: PayrollRecord) => <div className="text-right">{pr.jobs_completed}</div> },
    { key: 'earnings', label: 'Earnings', render: (pr: PayrollRecord) => <div className="text-right font-medium text-accent">${pr.total_earnings.toFixed(2)}</div> },
    { key: 'status', label: 'Status', render: (pr: PayrollRecord) => <div className="text-right"><StatusBadge status={pr.status} /></div> },
  ]

  return (
    <div className="p-8 animate-fade-in">
      <Button
        onClick={() => router.push('/app/employees')}
        variant="ghost"
        size="sm"
        className="mb-4"
      >
        <ArrowLeft size={14} />
        Back to Employees
      </Button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent-dim flex items-center justify-center text-accent font-bold text-xl">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{employee.name}</h1>
              <StatusBadge status={employee.status} />
            </div>
            <p className="text-sm text-muted">
              {employee.role || '—'} · {employee.pay_type === 'hourly' ? `$${employee.hourly_rate}/hr` : employee.pay_type === 'per_job' ? `$${employee.per_job_rate}/job` : `$${employee.hourly_rate}/hr + $${employee.per_job_rate}/job`}
            </p>
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>Hired {formatDate(employee.hire_date)}</div>
          {employee.email && <div>{employee.email}</div>}
          {employee.phone && <div>{employee.phone}</div>}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4 mb-8">
        <Card padding="sm" className="animate-fade-in">
          <div className="text-xs text-muted mb-1">Rating</div>
          <div className="text-xl font-bold text-warning">{employee.rating.toFixed(1)}</div>
          <div className="mt-0.5">{renderStars(employee.rating)}</div>
        </Card>
        <StatsCard label="Completion Rate" value={`${(employee.completion_rate * 100).toFixed(0)}%`} accent="accent" />
        <StatsCard label="Punctuality" value={`${(employee.punctuality_score * 100).toFixed(0)}%`} accent="accent" />
        <StatsCard label="Missed Jobs" value={employee.missed_jobs} accent={employee.missed_jobs > 3 ? 'danger' : 'white'} />
        <StatsCard label="Total Jobs" value={employee.total_jobs} accent="white" />
        <StatsCard label="Tenure" value={formatDate(employee.hire_date)} accent="white" />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card padding="md" className="animate-fade-in">
          <div className="text-xs text-muted mb-2">Hourly Rate</div>
          <div className="text-lg font-bold text-foreground">${employee.hourly_rate.toFixed(2)}</div>
        </Card>
        <Card padding="md" className="animate-fade-in">
          <div className="text-xs text-muted mb-2">Per Job Rate</div>
          <div className="text-lg font-bold text-foreground">${employee.per_job_rate.toFixed(2)}</div>
        </Card>
        <Card padding="md" className="animate-fade-in">
          <div className="text-xs text-muted mb-2">Pay Type</div>
          <div className="text-lg font-bold text-accent capitalize">{employee.pay_type.replace('_', ' / ')}</div>
        </Card>
      </div>

      {warnings.length > 0 && (
        <div className="mb-8 animate-fade-in">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-warning" />
            Early Warnings
          </h3>
          <div className="space-y-2">
            {warnings.map((w) => (
              <Card
                key={w.id}
                padding="md"
                className={`flex items-center justify-between ${!w.acknowledged ? 'border-l-2 border-l-danger' : 'opacity-60'}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={w.severity === 'red' ? 'danger' : 'warning'} className="text-[10px]">
                      {w.severity.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">{w.warning_type.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(w.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground">{w.message}</p>
                </div>
                {!w.acknowledged ? (
                  <Button onClick={() => acknowledgeWarning(w.id)} variant="primary" size="sm" className="ml-4 whitespace-nowrap">
                    Acknowledge
                  </Button>
                ) : (
                  <span className="ml-4 text-xs text-muted-foreground">Acknowledged</span>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card padding="md" className="animate-fade-in">
          <h3 className="text-lg font-bold text-foreground mb-4">Clock History</h3>
          <Table
            columns={clockColumns}
            data={clockEvents}
            emptyState={
              <EmptyState
                icon={<Clock size={24} />}
                title="No clock events recorded"
                description=""
              />
            }
          />
        </Card>

        <Card padding="md" className="animate-fade-in">
          <h3 className="text-lg font-bold text-foreground mb-4">Payroll History</h3>
          <Table
            columns={payrollColumns}
            data={payrollRecords}
            emptyState={
              <EmptyState
                icon={<DollarSign size={24} />}
                title="No payroll records yet"
                description=""
              />
            }
          />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card padding="md" className="animate-fade-in">
          <h3 className="text-lg font-bold text-foreground mb-3">Skills</h3>
          {employee.skills && employee.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {employee.skills.map((s, i) => (
                <Badge key={i} variant="accent">{s}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No skills listed.</p>
          )}
        </Card>
        <Card padding="md" className="animate-fade-in">
          <h3 className="text-lg font-bold text-foreground mb-3">Certifications</h3>
          {employee.certifications && employee.certifications.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {employee.certifications.map((c, i) => (
                <Badge key={i} variant="warning">{c}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No certifications listed.</p>
          )}
        </Card>
      </div>

      {employee.notes && (
        <Card padding="md" className="mt-6 animate-fade-in">
          <h3 className="text-lg font-bold text-foreground mb-2">Notes</h3>
          <p className="text-sm text-muted whitespace-pre-wrap">{employee.notes}</p>
        </Card>
      )}
    </div>
  )
}
