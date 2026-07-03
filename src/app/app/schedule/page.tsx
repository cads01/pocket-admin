'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Card from '@/components/ui/Card'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekStart(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getWeekLabel(start: Date) {
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const s = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const e = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${s} — ${e}`
}

interface Event {
  time: string
  title: string
  client: string
}

interface DaySchedule {
  date: Date
  events: Event[]
  isToday: boolean
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('pocket_schedule_events')
    if (saved) {
      try { setEvents(JSON.parse(saved)) } catch { /* empty */ }
    }
  }, [])

  function prevWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }

  function nextWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: DaySchedule[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    return {
      date: d,
      events: events.filter(() => false), // placeholder: would filter by date
      isToday: d.getTime() === today.getTime(),
    }
  })

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Schedule</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{getWeekLabel(weekStart)}</span>
          <button onClick={prevWeek} className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-surface-hover transition-colors cursor-pointer"><ChevronLeft size={16} /></button>
          <button onClick={nextWeek} className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-surface-hover transition-colors cursor-pointer"><ChevronRight size={16} /></button>
        </div>
      </div>

      <Card padding="lg" className="overflow-hidden">
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted uppercase tracking-wider py-2">{day}</div>
          ))}
          {days.map((day) => (
            <div
              key={day.date.toISOString()}
              className={`rounded-lg p-2 min-h-[100px] border transition-colors ${
                day.isToday
                  ? 'border-accent/30 bg-accent-dim/30'
                  : 'border-[rgba(255,255,255,0.06)] bg-[rgba(18,18,18,0.5)]'
              }`}
            >
              <div className={`text-xs font-semibold mb-1.5 ${day.isToday ? 'text-accent' : 'text-muted'}`}>
                {day.date.getDate()}
              </div>
              {day.events.length === 0 && (
                <div className="text-[10px] text-[#444] mt-2">—</div>
              )}
              {day.events.map((ev, i) => (
                <div key={i} className="bg-accent-dim/40 border border-accent/15 rounded px-1.5 py-0.5 mb-0.5 cursor-pointer hover:bg-accent-dim/60 transition-colors">
                  <div className="text-[10px] font-semibold text-accent">{ev.time}</div>
                  <div className="text-[10px] text-[#bbb] truncate">{ev.title}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <div className="text-center mt-6 text-xs text-muted">
        Bookings and events will appear here once created.
      </div>
    </div>
  )
}
