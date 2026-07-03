'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { Booking } from '@/lib/supabase'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-elevated border border-card-border shadow-elevated rounded-xl px-3 py-2 text-sm">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="text-accent font-semibold">${payload[0].value.toFixed(0)}</p>
    </div>
  )
}

export default function RevenueChart({ bookings }: { bookings: Booking[] }) {
  const data = useMemo(() => {
    const completed = bookings.filter(
      (b) => b.status === 'completed' || b.status === 'reviewed'
    )
    const byMonth: Record<string, number> = {}
    completed.forEach((b) => {
      const key = b.created_at?.slice(0, 7) || b.scheduled_date?.slice(0, 7)
      if (!key) return
      byMonth[key] = (byMonth[key] || 0) + b.amount
    })
    const sorted = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
    return sorted.map(([month, revenue]) => ({
      month,
      revenue,
    }))
  }, [bookings])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No revenue data yet
      </div>
    )
  }

  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d28e" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#00d28e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#555', fontSize: 11 }}
            axisLine={{ stroke: '#1a1a1a' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#555', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2a2a2a' }} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#00d28e"
            strokeWidth={2}
            fill="url(#revenueGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
