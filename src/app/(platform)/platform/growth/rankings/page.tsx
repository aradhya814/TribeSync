'use client'

import { useEffect, useState } from 'react'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type RankingRow = {
  ranking: { id: string; rankPosition: number; score: string | null; period: string; niche: string | null }
  profile: { id: string; fullName: string | null; email: string; niche: string | null; avgViews: number | null }
}

const periods = [
  { key: 'all-time', label: 'All-Time' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'weekly', label: 'Weekly' },
]

function medal(rank: number) {
  if (rank === 1) return 'Gold'
  if (rank === 2) return 'Silver'
  if (rank === 3) return 'Bronze'
  return `#${rank}`
}

export default function RankingsPage() {
  const [period, setPeriod] = useState('weekly')
  const [rows, setRows] = useState<RankingRow[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    void fetch(`/api/growth/rankings?period=${period}`)
      .then((response) => response.json() as Promise<{ rankings: RankingRow[]; currentUserId: string }>)
      .then((data) => {
        setRows(data.rankings)
        setCurrentUserId(data.currentUserId)
      })
  }, [period])

  return (
    <div className="space-y-6">
      <div>
        <p className="caption">Growth</p>
        <h1 className="heading-1">Rankings</h1>
      </div>
      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList className="bg-surface">
          {periods.map((item) => (
            <TabsTrigger key={item.key} value={item.key}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="glass-card overflow-hidden">
        <div className="divide-y divide-hairline">
          {rows.map((row) => (
            <div
              key={row.ranking.id}
              className={row.profile.id === currentUserId ? 'grid gap-3 bg-tribe-primary/10 p-4 md:grid-cols-[120px_1fr_auto_auto]' : 'grid gap-3 p-4 md:grid-cols-[120px_1fr_auto_auto]'}
            >
              <span className="text-sm font-bold text-white">{medal(row.ranking.rankPosition)}</span>
              <div>
                <p className="text-sm font-semibold text-white">{row.profile.fullName ?? row.profile.email}</p>
                <p className="caption">{row.profile.niche ?? row.ranking.niche ?? 'general'}</p>
              </div>
              <span className="body-text">{(row.profile.avgViews ?? 0).toLocaleString('en-IN')} avg views</span>
              <span className="caption">{Number(row.ranking.score ?? 0).toLocaleString('en-IN')} score</span>
            </div>
          ))}
          {rows.length === 0 ? <p className="body-text p-4">No rankings calculated yet.</p> : null}
        </div>
      </div>
    </div>
  )
}
