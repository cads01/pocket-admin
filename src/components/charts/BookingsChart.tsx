'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { Booking } from '@/lib/supabase'

const STATUS_COLORS: Record<string, string> = {
  requested: '#8b5cf6',
  assigned: '#00b4ff',
  in_progress: '#00d28e',
  completed: '#ffd700',
  reviewed: '#00f0ff',
  cancelled: '#ff5050',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-elevated border border-card-border shadow-elevated rounded-xl px-3 py-2 text-sm">
      <p className="text-muted-foreground text-xs mb-1 capitalize">{label}</p>
      <p className="text-white font-semibold">{payload[0].value} bookings</p>
    </div>
  )
}

export default function BookingsChart({ bookings }: { bookings: Booking[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    const order = ['requested', 'assigned', 'in_progress', 'completed', 'reviewed', 'cancelled']
    order.forEach((s) => (counts[s] = 0))
    bookings.forEach((b) => {
      if (counts[b.status] !== undefined) counts[b.status]++
    })
    return order
      .filter((s) => counts[s] > 0)
      .map((status) => ({
        status,
        count: counts[status],
        fill: STATUS_COLORS[status] || '#555',
      }))
  }, [bookings])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No booking data yet
      </div>
    )
  }

  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          <XAxis
            dataKey="status"
            tick={{ fill: '#555', fontSize: 11 }}
            axisLine={{ stroke: '#1a1a1a' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#555', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
            {data.map((entry, idx) => (
              <rect key={idx} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
