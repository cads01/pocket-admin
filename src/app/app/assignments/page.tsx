'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { fmtDate, fmtTime, today } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import type { Employee, Booking } from '@/lib/supabase'

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
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Job Assignments</h2>
              <p className="text-sm text-[#888]">Assign employees to jobs on the schedule</p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
            />
          </div>

          <div className="grid grid-cols-[300px_1fr] gap-6">
            {/* Employee list */}
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-[#888] uppercase tracking-wide">Employees</h3>
              <div className="space-y-2">
                {employees.length === 0 ? (
                  <p className="text-xs text-[#555] py-4 text-center">No active employees</p>
                ) : (
                  employees.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between p-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${
                          emp.status === 'active' ? 'bg-[#00d28e]' : 'bg-[#555]'
                        }`} />
                        <div>
                          <div className="text-sm font-medium">{emp.name}</div>
                          <div className="text-xs text-[#888]">
                            {employeeJobCount[emp.id] || 0} active job{(employeeJobCount[emp.id] || 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Jobs for selected date */}
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-[#888] uppercase tracking-wide">
                Jobs — {fmtDate(selectedDate)}
              </h3>
              <div className="space-y-3">
                {bookings.length === 0 ? (
                  <div className="text-center py-16 text-[#555]">
                    <div className="text-4xl mb-3 opacity-30">📅</div>
                    <p>No jobs scheduled for this date</p>
                  </div>
                ) : (
                  bookings.map((b) => {
                    const assignedEmp = b.employees?.name || null
                    return (
                      <div
                        key={b.id}
                        className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-sm font-medium">{b.address || 'No address'}</div>
                            <div className="text-xs text-[#888] mt-0.5">
                              {b.scheduled_date ? fmtTime(b.scheduled_date.slice(11, 16)) : ''} — {b.duration}h
                            </div>
                          </div>
                          <div className="text-xs text-[#888]">${b.amount}</div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1a1a1a]">
                          <div className="text-xs">
                            {assignedEmp ? (
                              <span className="text-[#00d28e]">Assigned: {assignedEmp}</span>
                            ) : (
                              <span className="text-[#ffd700]">Unassigned</span>
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
                                className="px-2 py-1 text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded text-white focus:outline-none"
                              >
                                <option value="">Select...</option>
                                {employees.map((emp) => (
                                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => setAssigningId(null)}
                                className="text-xs text-[#555] hover:text-white cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAssigningId(b.id)}
                              className="px-3 py-1 text-xs bg-[rgba(0,210,142,0.12)] text-[#00d28e] rounded-md hover:bg-[rgba(0,210,142,0.2)] cursor-pointer"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
