'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { Customer, Cleaner } from '@/lib/supabase'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-elevated border border-card-border shadow-elevated rounded-xl px-3 py-2 text-sm">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="text-purple font-semibold">{payload[0].value} total</p>
    </div>
  )
}

export default function ClientChart({
  customers,
}: {
  customers: Customer[]
}) {
  const data = useMemo(() => {
    const byMonth: Record<string, number> = {}
    const sorted = [...customers].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    let cumulative = 0
    const months: { month: string; total: number }[] = []

    sorted.forEach((c) => {
      const key = c.created_at?.slice(0, 7)
      if (!key) return
      byMonth[key] = (byMonth[key] || 0) + 1
    })

    const entries = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
    for (const [month, count] of entries) {
      cumulative += count
      months.push({ month, total: cumulative })
    }

    return months
  }, [customers])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No client data yet
      </div>
    )
  }

  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2a2a2a' }} />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 3 }}
            activeDot={{ r: 5, fill: '#8b5cf6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
