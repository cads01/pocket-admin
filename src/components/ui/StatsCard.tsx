'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'

const accentMap: Record<string, string> = {
  accent: 'text-accent',
  warning: 'text-warning',
  danger: 'text-danger',
  purple: 'text-purple',
  info: 'text-info',
  white: 'text-white',
}

export default function StatsCard({
  label,
  value,
  subtext,
  accent = 'accent',
  icon: Icon,
  trend,
}: {
  label: string
  value: string | number
  subtext?: string
  accent?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  trend?: 'up' | 'down' | number
}) {
  const trendNum = typeof trend === 'number' ? trend : null
  const trendUp = trend === 'up' || (trendNum !== null && trendNum > 0)
  const trendDown = trend === 'down' || (trendNum !== null && trendNum < 0)

  return (
    <div className="bg-card border border-card-border shadow-card rounded-xl p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted uppercase tracking-wide font-medium">{label}</span>
        {Icon && <Icon size={16} className="text-muted" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${accentMap[accent] || accentMap.accent}`}>
          {value}
        </span>
        {trendNum !== null && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trendUp ? 'text-accent' : 'text-danger'}`}>
            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trendNum)}%
          </span>
        )}
      </div>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </div>
  )
}
