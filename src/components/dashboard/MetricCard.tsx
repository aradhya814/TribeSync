import type { ComponentType } from 'react'

import { Skeleton } from '@/components/ui/skeleton'

type MetricCardProps = {
  label: string
  value?: string | number
  subValue?: string
  changePercent?: number
  changeLabel?: string
  icon?: ComponentType<{ className?: string }>
}

export function MetricCard({ label, value, subValue, changePercent, changeLabel, icon: Icon }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="metric-label">{label}</p>
          {value === undefined ? <Skeleton className="mt-2 h-8 w-28" /> : <p className="metric-value">{value}</p>}
        </div>
        {Icon ? (
          <div className="flex size-10 items-center justify-center rounded-lg border border-hairline bg-surface-elevated">
            <Icon className="size-5 text-tribe-primary" />
          </div>
        ) : null}
      </div>
      {subValue ? <p className="caption">{subValue}</p> : null}
      {changePercent !== undefined ? (
        <p className={changePercent >= 0 ? 'metric-change-up' : 'metric-change-down'}>
          {changePercent >= 0 ? '+' : ''}
          {changePercent}% {changeLabel ?? ''}
        </p>
      ) : null}
    </div>
  )
}
