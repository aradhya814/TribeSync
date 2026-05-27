'use client'

import { BadgeIndianRupee, Clock3, ShieldCheck, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { MetricCard } from '@/components/dashboard/MetricCard'
import { Button } from '@/components/ui/button'

type CreatorStats = {
  totalEarned: number
  dealsThisMonth: number
  dealChangePercent: number
  deliveryReliabilityScore: number
  weeklyRank: number | null
  rankScore: number
  rateBenchmarks: { rateP25: string; rateMedian: string; rateP75: string } | null
  recentDeals: Array<{ id: string; status: string | null; amount: number; createdAt: string }>
}

type EarningsPoint = { month: string; earnings: number }
type VelocityPoint = { month: string; initiated: number; completed: number }

function formatInr(amount: number) {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

export default function CreatorGrowthDashboardPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [stats, setStats] = useState<CreatorStats | null>(null)
  const [earnings, setEarnings] = useState<EarningsPoint[]>([])
  const [velocity, setVelocity] = useState<VelocityPoint[]>([])

  useEffect(() => {
    setIsMounted(true)
    void Promise.all([
      fetch('/api/dashboard/creator/stats').then((response) => response.json() as Promise<CreatorStats>),
      fetch('/api/dashboard/creator/earnings-chart').then((response) => response.json() as Promise<{ data: EarningsPoint[] }>),
      fetch('/api/dashboard/creator/deal-velocity').then((response) => response.json() as Promise<{ data: VelocityPoint[] }>),
    ]).then(([statsData, earningsData, velocityData]) => {
      setStats(statsData)
      setEarnings(earningsData.data)
      setVelocity(velocityData.data)
    })
  }, [])

  const hasEarnings = earnings.some((point) => point.earnings > 0)

  return (
    <div className="space-y-6">
      <div>
        <p className="caption">Creator growth</p>
        <h1 className="heading-1">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total earned" value={stats ? formatInr(stats.totalEarned) : undefined} icon={BadgeIndianRupee} />
        <MetricCard
          label="Deals this month"
          value={stats?.dealsThisMonth}
          changePercent={stats?.dealChangePercent}
          changeLabel="vs last month"
          icon={Clock3}
        />
        <MetricCard label="Reliability" value={stats ? `${stats.deliveryReliabilityScore}%` : undefined} icon={ShieldCheck} />
        <MetricCard label="Weekly rank" value={stats?.weeklyRank ? `#${stats.weeklyRank}` : stats ? 'Unranked' : undefined} icon={Trophy} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="glass-card p-5">
          <h2 className="heading-2">Earnings</h2>
          {isMounted && hasEarnings ? (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={earnings}>
                  <CartesianGrid stroke="#242834" />
                  <XAxis dataKey="month" stroke="#8f96a3" />
                  <YAxis stroke="#8f96a3" />
                  <Tooltip formatter={(value) => formatInr(Number(value))} />
                  <Line type="monotone" dataKey="earnings" stroke="#EF5B5B" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-hairline bg-surface-elevated p-5">
              <p className="body-text">Connect YouTube or close your first paid deal to populate earnings.</p>
              <Button className="mt-4 bg-tribe-primary hover:bg-tribe-primary-hover">Connect YouTube</Button>
            </div>
          )}
        </section>

        <section className="glass-card p-5">
          <h2 className="heading-2">Deal velocity</h2>
          {isMounted ? (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocity}>
                <CartesianGrid stroke="#242834" />
                <XAxis dataKey="month" stroke="#8f96a3" />
                <YAxis stroke="#8f96a3" />
                <Tooltip />
                <Bar dataKey="initiated" fill="#EF5B5B" />
                <Bar dataKey="completed" fill="#33C481" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          ) : (
            <div className="mt-4 h-72 rounded-lg border border-hairline bg-surface-elevated" />
          )}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="glass-card p-5">
          <h2 className="heading-2">Rank score</h2>
          <div className="mt-4 grid gap-3">
            {['Avg views', 'View ratio', 'Completion', 'Recency'].map((label, index) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-xs text-text-mid">
                  <span>{label}</span>
                  <span>{stats ? Math.max(0, Math.round(stats.rankScore / (index + 4))) : 0}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-elevated">
                  <div className="h-2 rounded-full bg-tribe-primary" style={{ width: `${stats ? Math.min(100, stats.rankScore / 10) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card p-5">
          <h2 className="heading-2">Rate intelligence</h2>
          {stats?.rateBenchmarks ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['P25', stats.rateBenchmarks.rateP25],
                ['Median', stats.rateBenchmarks.rateMedian],
                ['P75', stats.rateBenchmarks.rateP75],
              ].map(([label, amount]) => (
                <div key={label} className="rounded-lg border border-hairline bg-surface-elevated p-3">
                  <p className="metric-label">{label}</p>
                  <p className="text-lg font-bold text-white">{formatInr(Number(amount))}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="body-text mt-4">No niche benchmark available yet.</p>
          )}
        </section>
      </div>

      <section className="glass-card overflow-hidden">
        <div className="border-b border-hairline p-4">
          <h2 className="heading-2">Recent deals</h2>
        </div>
        <div className="divide-y divide-hairline">
          {stats?.recentDeals.map((deal) => (
            <div key={deal.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto_auto]">
              <span className="text-sm font-semibold text-white">{deal.id.slice(0, 8)}</span>
              <span className="body-text">{formatInr(deal.amount)}</span>
              <span className="caption">{deal.status}</span>
            </div>
          ))}
          {stats?.recentDeals.length === 0 ? <p className="body-text p-4">No deals yet.</p> : null}
        </div>
      </section>
    </div>
  )
}
