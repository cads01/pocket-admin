'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Booking, Employee, ManagedClient, Profile, EmployeeWarning } from '@/lib/supabase'
import { fmtDate, fmtTime } from '@/lib/utils'
import CleanerMap from '@/components/CleanerMap'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Card from '@/components/ui/Card'
import StatsCard from '@/components/ui/StatsCard'
import StatusBadge from '@/components/ui/StatusBadge'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import EmptyState from '@/components/ui/EmptyState'
import { AlertTriangle, ClipboardList, Download, AlertCircle, CheckCircle, TrendingUp, BarChart3, Users } from 'lucide-react'
import RevenueChart from '@/components/charts/RevenueChart'
import BookingsChart from '@/components/charts/BookingsChart'
import ClientChart from '@/components/charts/ClientChart'

export default function DashboardPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [managedClients, setManagedClients] = useState<ManagedClient[]>([])
  const [waitlist, setWaitlist] = useState<any[]>([])
  const [warnings, setWarnings] = useState<EmployeeWarning[]>([])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }

    loadData()
  }, [user, loading])

  async function loadData() {
    if (!supabase) return
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single()
    if (p) setProfile(p)

    if (p?.role === 'admin') {
      const { data: b } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (b) setBookings(b)

      const { data: emp } = await supabase.from('employees').select('*')
      if (emp) setEmployees(emp)

      const { data: mc } = await supabase.from('managed_clients').select('*').order('since', { ascending: false })
      if (mc) setManagedClients(mc)

      const { data: w } = await supabase.from('waitlist_signups').select('*').order('signed_up_at', { ascending: false })
      if (w) setWaitlist(w)

      const { data: warns } = await supabase.from('employee_warnings').select('*, employee:employees(name)').is('resolved_at', null).order('created_at', { ascending: false })
      if (warns) setWarnings(warns as any)
    } else if (p?.role === 'employee') {
      const { data: e } = await supabase
        .from('employees')
        .select('*')
        .limit(1)
        .single()
      if (e) {
        setEmployee(e)
        const { data: b } = await supabase
          .from('bookings')
          .select('*')
          .eq('employee_id', e.id)
          .order('scheduled_date', { ascending: true })
        if (b) setBookings(b)
      }
    }
  }

  if (loading || !profile) {
    return (
      <div className="p-4 md:p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div>
            <LoadingSkeleton type="text" />
          </div>
        </div>
        <LoadingSkeleton type="stats" />
        <LoadingSkeleton type="table" />
      </div>
    )
  }

  const totalRevenue = bookings
    .filter((b) => b.status === 'completed' || b.status === 'reviewed')
    .reduce((s, b) => s + b.amount, 0)

  const totalFees = bookings
    .filter((b) => b.status === 'completed' || b.status === 'reviewed')
    .reduce((s, b) => s + b.platform_fee, 0)

  const activeEmployees = employees.filter((e) => e.status === 'active').length

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayJobs = bookings.filter((b) => b.scheduled_date === todayStr)

  const upcomingJobs = bookings
    .filter((b) => b.scheduled_date >= todayStr && b.status !== 'cancelled')
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    .slice(0, 8)

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6 animate-fade-in">
        <div>
          <h2 className="text-lg md:text-xl font-bold">
            Welcome back, {profile.name || 'User'}
          </h2>
          <p className="text-sm text-muted">
            {profile.role === 'admin'
              ? 'Platform overview'
              : profile.role === 'employee'
              ? 'Your upcoming jobs'
              : 'Your bookings'}
          </p>
        </div>
      </div>

      {profile.role === 'admin' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 md:mb-6">
            <StatsCard
              label="Waitlist Signups"
              value={waitlist.length}
              subtext={`${waitlist.filter(w => w.team_size === 1).length} solo operators`}
              accent="accent"
            />
            <StatsCard
              label="Active Clients"
              value={managedClients.filter(c => c.status === 'active').length}
              subtext={`${managedClients.filter(c => c.status === 'trial').length} in trial · ${managedClients.filter(c => c.status === 'churned').length} churned`}
              accent="info"
            />
            <StatsCard
              label="Active Warnings"
              value={warnings.length}
              subtext={`${warnings.filter(w => w.severity === 'red').length} red · ${warnings.filter(w => w.severity === 'yellow').length} yellow`}
              accent={warnings.length > 0 ? 'danger' : 'accent'}
            />
            <StatsCard
              label="Conversion Rate"
              value={waitlist.length ? `${Math.round((managedClients.length / (waitlist.length + managedClients.length)) * 100)}%` : '0%'}
              subtext={`${managedClients.length} converted · ${waitlist.length} in pipeline`}
              accent="purple"
            />
          </div>

          {/* Early Warnings */}
          {warnings.length > 0 && (
            <div className="mb-6 space-y-2 animate-fade-in-up">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle size={18} className="text-warning" /> Early Warnings
              </h3>
              {warnings.map(w => (
                <Card
                  key={w.id}
                  variant="default"
                  padding="sm"
                  className={`border ${
                    w.severity === 'red'
                      ? 'bg-[rgba(255,80,80,0.08)] border-[rgba(255,80,80,0.25)]'
                      : 'bg-[rgba(255,215,0,0.08)] border-[rgba(255,215,0,0.25)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {w.severity === 'red' ? <AlertCircle size={18} className="text-danger mt-0.5" /> : <AlertTriangle size={18} className="text-warning mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{w.message}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {(w as any).employee?.name || 'Unknown'} · {new Date(w.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 md:mb-6 animate-fade-in-up">
            <Card variant="default" padding="md">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-accent" />
                <h3 className="text-sm font-semibold">Revenue</h3>
              </div>
              <RevenueChart bookings={bookings} />
            </Card>
            <Card variant="default" padding="md">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} className="text-info" />
                <h3 className="text-sm font-semibold">Bookings by Status</h3>
              </div>
              <BookingsChart bookings={bookings} />
            </Card>
            <Card variant="default" padding="md">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-purple" />
                <h3 className="text-sm font-semibold">Client Growth</h3>
              </div>
              <ClientChart clients={managedClients} />
            </Card>
          </div>

          {/* Waitlist */}
          <Card variant="default" className="mb-4 md:mb-6 overflow-x-auto p-0 animate-fade-in-up">
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-card-border">
              <h3 className="font-semibold">Waitlist Signups</h3>
              <Button variant="secondary" size="sm" icon={Download}>Export CSV</Button>
            </div>
            {waitlist.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={48} className="text-muted" />}
                title="No signups yet"
                description="Post in Facebook groups and they'll appear here."
              />
            ) : (
              <div className="min-w-[600px]">
              <Table
                columns={[
                  { key: 'name', label: 'Name', render: (w: any) => <span className="font-medium">{w.name}</span> },
                  { key: 'business', label: 'Business', render: (w: any) => <span className="text-muted">{w.business || '—'}</span> },
                  { key: 'email', label: 'Email', render: (w: any) => <span className="text-muted">{w.email || '—'}</span> },
                  { key: 'phone', label: 'Phone', render: (w: any) => <span className="text-muted">{w.phone || '—'}</span> },
                  { key: 'team_size', label: 'Team' },
                  { key: 'pain_point', label: 'Pain Point', render: (w: any) => <span className="text-warning text-xs">{w.pain_point || '—'}</span> },
                  { key: 'signed_up_at', label: 'Signed Up', render: (w: any) => <span className="text-muted-foreground text-xs">{fmtDate(w.signed_up_at)}</span> },
                ]}
                data={waitlist}
              />
              </div>
            )}
          </Card>

          {/* Managed Clients */}
          <Card variant="default" className="mb-4 md:mb-6 overflow-x-auto p-0 animate-fade-in-up">
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-card-border">
              <h3 className="font-semibold">Client Management</h3>
              <div className="flex gap-2">
                <Button variant="primary" size="sm">➕ Add Client</Button>
              <Button variant="secondary" size="sm" icon={Download}>Export CSV</Button>
              </div>
            </div>
            {managedClients.length === 0 ? (
              <EmptyState
                icon={<span>🧑‍🤝‍🧑</span>}
                title="No clients yet"
                description="Convert your first waitlist signup."
              />
            ) : (
              <div className="min-w-[600px]">
              <Table
                columns={[
                  { key: 'name', label: 'Name', render: (c: any) => <span className="font-medium">{c.name}</span> },
                  { key: 'phone', label: 'Phone', render: (c: any) => <span className="text-muted">{c.phone || '—'}</span> },
                  { key: 'schedule', label: 'Schedule', render: (c: any) => <span className="text-muted text-xs">{c.schedule || '—'}</span> },
                  { key: 'price_per_job', label: 'Price/Job', render: (c: any) => <span>${(c.price_per_job || 0).toFixed(0)}</span> },
                  { key: 'since', label: 'Since', render: (c: any) => <span className="text-muted-foreground text-xs">{fmtDate(c.since)}</span> },
                  { key: 'mrr', label: 'MRR', render: (c: any) => <span className="text-warning">${(c.mrr || 0).toFixed(0)}</span> },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (c: any) => (
                      <Badge variant={c.status === 'active' ? 'accent' : c.status === 'trial' ? 'warning' : 'danger'}>{c.status}</Badge>
                    ),
                  },
                ]}
                data={managedClients}
              />
              </div>
            )}
          </Card>

          <div className="animate-fade-in-up">
            <CleanerMap />
          </div>

          <Card variant="default" className="overflow-x-auto animate-fade-in-up">
            <h3 className="font-semibold mb-4">Recent Bookings</h3>
            {upcomingJobs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming bookings</p>
            ) : (
              <div className="min-w-[600px]">
              <Table
                columns={[
                  { key: 'id', label: 'Customer', render: (b: any) => <span className="font-medium">{b.id.slice(0, 8)}</span> },
                  { key: 'employee_id', label: 'Cleaner', render: (b: any) => <span className="text-muted">{b.employee_id?.slice(0, 8)}</span> },
                  { key: 'scheduled_date', label: 'Date', render: (b: any) => <span>{fmtDate(b.scheduled_date)}</span> },
                  { key: 'amount', label: 'Amount', render: (b: any) => <span>${b.amount.toFixed(0)}</span> },
                  { key: 'status', label: 'Status', render: (b: any) => <StatusBadge status={b.status} /> },
                ]}
                data={upcomingJobs}
              />
              </div>
            )}
          </Card>
        </>
      )}

      {profile.role === 'employee' && employee && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            label="Today's Jobs"
            value={todayJobs.length}
            accent="accent"
          />
          <StatsCard
            label="Total Earnings"
            value={`$0`}
            accent="warning"
          />
          <StatsCard
            label="Rating"
            value={'0.0'}
            accent="purple"
          />
        </div>
      )}
    </div>
  )
}
