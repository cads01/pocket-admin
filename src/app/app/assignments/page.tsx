'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { fmtDate, fmtTime, today } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import type { Employee, Booking } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { Calendar } from 'lucide-react'

type BookingWithEmployee = Booking & { employees: { name: string } | null }

export default function AssignmentsPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [bookings, setBookings] = useState<BookingWithEmployee[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(today())
  const [assigningId, setAssigningId] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    load()
  }, [user, loading, selectedDate])

  async function load() {
    if (!supabase) return
    setPageLoading(true)

    const { data: emps } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'active')
    if (emps) setEmployees(emps)

    const { data: books } = await supabase
      .from('bookings')
      .select('*, employees(name)')
      .gte('scheduled_date', selectedDate + 'T00:00:00')
      .lte('scheduled_date', selectedDate + 'T23:59:59')
      .order('scheduled_date', { ascending: true })
    if (books) setBookings(books as unknown as BookingWithEmployee[])

    setPageLoading(false)
  }

  async function assignEmployee(bookingId: string, employeeId: string) {
    if (!supabase) return
    await supabase
      .from('bookings')
      .update({ employee_id: employeeId } as any)
      .eq('id', bookingId)
    setAssigningId(null)
    await load()
  }

  const employeeJobCount: Record<string, number> = {}
  for (const b of bookings) {
    if (b.employee_id) {
      employeeJobCount[b.employee_id] = (employeeJobCount[b.employee_id] || 0) + 1
    }
  }

  return (
    <div className="p-8">
      {pageLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton type="stats" />
          <LoadingSkeleton type="table" />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Job Assignments</h2>
              <p className="text-sm text-muted">Assign employees to jobs on the schedule</p>
            </div>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>

          <div className="grid grid-cols-[300px_1fr] gap-6">
            <Card padding="md" className="animate-fade-in">
              <h3 className="text-sm font-semibold mb-3 text-muted uppercase tracking-wide">Employees</h3>
              <div className="space-y-2">
                {employees.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No active employees</p>
                ) : (
                  employees.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between p-3 bg-surface border border-card-border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${emp.status === 'active' ? 'bg-accent' : 'bg-muted'}`} />
                        <div>
                          <div className="text-sm font-medium text-foreground">{emp.name}</div>
                          <div className="text-xs text-muted">
                            {employeeJobCount[emp.id] || 0} active job{(employeeJobCount[emp.id] || 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card padding="md" className="animate-fade-in">
              <h3 className="text-sm font-semibold mb-3 text-muted uppercase tracking-wide">
                Jobs — {fmtDate(selectedDate)}
              </h3>
              <div className="space-y-3">
                {bookings.length === 0 ? (
                  <EmptyState
                    icon={<Calendar size={24} />}
                    title="No jobs scheduled for this date"
                    description=""
                  />
                ) : (
                  bookings.map((b) => {
                    const assignedEmp = b.employees?.name || null
                    return (
                      <div
                        key={b.id}
                        className="bg-surface border border-card-border rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-sm font-medium text-foreground">{b.address || 'No address'}</div>
                            <div className="text-xs text-muted mt-0.5">
                              {b.scheduled_date ? fmtTime(b.scheduled_date.slice(11, 16)) : ''} — {b.duration}h
                            </div>
                          </div>
                          <div className="text-xs text-muted">${b.amount}</div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-card-border">
                          <div className="text-xs">
                            {assignedEmp ? (
                              <span className="text-accent">Assigned: {assignedEmp}</span>
                            ) : (
                              <span className="text-warning">Unassigned</span>
                            )}
                          </div>
                          {assigningId === b.id ? (
                            <div className="flex gap-2">
                              <select
                                autoFocus
                                onChange={(e) => {
                                  if (e.target.value) assignEmployee(b.id, e.target.value)
                                }}
                                onBlur={() => setAssigningId(null)}
                                className="px-2 py-1 text-xs bg-input border border-input-border rounded text-foreground focus:outline-none"
                              >
                                <option value="">Select...</option>
                                {employees.map((emp) => (
                                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                              </select>
                              <Button
                                onClick={() => setAssigningId(null)}
                                variant="ghost"
                                size="sm"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => setAssigningId(b.id)}
                              variant="ghost"
                              size="sm"
                              className="text-accent"
                            >
                              Assign
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
