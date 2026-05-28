'use client'

import { AlertTriangle, BadgeIndianRupee, Handshake, LockKeyhole, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { MetricCard } from '@/components/dashboard/MetricCard'

type PlatformStats = {
  stats: {
    gmvToday: number
    revenueMtd: number
    activeDeals: number
    escrowLocked: number
    disputeRate: number
  }
  gmvDaily: Array<{ date: string; gmv: number }>
  userGrowth: Array<{ week: string; creators: number; msmes: number }>
  topCreators: Array<{ id: string; name: string; gmv: number; deals: number }>
  disputesQueue: Array<{ id: string; type: string; daysOld: number; description: string }>
  pendingActions: { campaignsPendingReview: number; disputesOver48h: number; paymentMismatches: number }
}

type FunnelData = {
  funnel: Array<{ stage: string; count: number }>
}

function formatInr(amount: number) {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

export default function AdminDashboardPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [platform, setPlatform] = useState<PlatformStats | null>(null)
  const [funnel, setFunnel] = useState<FunnelData['funnel']>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
    void Promise.all([
      fetch('/api/admin/stats/platform').then((response) => {
        if (!response.ok) throw new Error('Failed to load platform stats')
        return response.json() as Promise<PlatformStats>
      }),
      fetch('/api/admin/stats/funnel').then((response) => {
        if (!response.ok) throw new Error('Failed to load funnel stats')
        return response.json() as Promise<FunnelData>
      }),
    ]).then(([platformData, funnelData]) => {
      setPlatform(platformData)
      setFunnel(funnelData.funnel)
      setError(null)
    }).catch(() => {
      setError('Unable to load admin dashboard stats right now.')
    })
  }, [])

  return (
    <main className="min-h-screen bg-background p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <p className="caption">Admin</p>
          <h1 className="heading-1">Platform dashboard</h1>
        </div>

        {error ? (
          <section className="glass-card border-destructive/40 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </section>
        ) : null}

        <div className="grid gap-4 md:grid-cols-5">
          <MetricCard label="GMV today" value={platform ? formatInr(platform.stats.gmvToday) : undefined} icon={TrendingUp} />
          <MetricCard label="Revenue MTD" value={platform ? formatInr(platform.stats.revenueMtd) : undefined} icon={BadgeIndianRupee} />
          <MetricCard label="Active deals" value={platform?.stats.activeDeals} icon={Handshake} />
          <MetricCard label="Escrow locked" value={platform ? formatInr(platform.stats.escrowLocked) : undefined} icon={LockKeyhole} />
          <MetricCard label="Dispute rate" value={platform ? `${platform.stats.disputeRate}%` : undefined} icon={AlertTriangle} />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="glass-card p-5">
            <h2 className="heading-2">GMV, 30 days</h2>
            {isMounted ? (
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={platform?.gmvDaily ?? []}>
                    <CartesianGrid stroke="#242834" />
                    <XAxis dataKey="date" stroke="#8f96a3" />
                    <YAxis stroke="#8f96a3" />
                    <Tooltip formatter={(value) => formatInr(Number(value))} />
                    <Line type="monotone" dataKey="gmv" stroke="#EF5B5B" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-4 h-72 rounded-lg border border-hairline bg-surface-elevated" />
            )}
          </section>

          <section className="glass-card p-5">
            <h2 className="heading-2">User growth</h2>
            {isMounted ? (
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={platform?.userGrowth ?? []}>
                    <CartesianGrid stroke="#242834" />
                    <XAxis dataKey="week" stroke="#8f96a3" />
                    <YAxis stroke="#8f96a3" />
                    <Tooltip />
                    <Area type="monotone" dataKey="creators" stackId="1" stroke="#EF5B5B" fill="#EF5B5B" />
                    <Area type="monotone" dataKey="msmes" stackId="1" stroke="#33C481" fill="#33C481" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-4 h-72 rounded-lg border border-hairline bg-surface-elevated" />
            )}
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="glass-card p-5">
            <h2 className="heading-2">Deal pipeline</h2>
            {isMounted ? (
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Tooltip />
                    <Funnel dataKey="count" data={funnel} nameKey="stage" fill="#EF5B5B">
                      <LabelList position="right" fill="#f5f5f5" stroke="none" dataKey="stage" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-4 h-72 rounded-lg border border-hairline bg-surface-elevated" />
            )}
          </section>

          <section className="glass-card p-5">
            <h2 className="heading-2">Pending actions</h2>
            {isMounted ? (
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { label: 'Campaigns', value: platform?.pendingActions.campaignsPendingReview ?? 0 },
                      { label: 'Disputes 48h+', value: platform?.pendingActions.disputesOver48h ?? 0 },
                      { label: 'Mismatches', value: platform?.pendingActions.paymentMismatches ?? 0 },
                    ]}
                  >
                    <CartesianGrid stroke="#242834" />
                    <XAxis dataKey="label" stroke="#8f96a3" />
                    <YAxis stroke="#8f96a3" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#33C481" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-4 h-72 rounded-lg border border-hairline bg-surface-elevated" />
            )}
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="glass-card overflow-hidden">
            <div className="border-b border-hairline p-4">
              <h2 className="heading-2">Top creators by GMV</h2>
            </div>
            <div className="divide-y divide-hairline">
              {platform?.topCreators.map((creator) => (
                <div key={creator.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto_auto]">
                  <span className="text-sm font-semibold text-white">{creator.name}</span>
                  <span className="body-text">{formatInr(creator.gmv)}</span>
                  <span className="caption">{creator.deals} deals</span>
                </div>
              ))}
              {platform?.topCreators.length === 0 ? <p className="body-text p-4">No creator GMV yet.</p> : null}
            </div>
          </section>

          <section className="glass-card overflow-hidden">
            <div className="border-b border-hairline p-4">
              <h2 className="heading-2">Disputes queue</h2>
            </div>
            <div className="divide-y divide-hairline">
              {platform?.disputesQueue.map((dispute) => (
                <div key={dispute.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">{dispute.type}</span>
                    <span className="caption">{dispute.daysOld} days old</span>
                  </div>
                  <p className="body-text mt-1 line-clamp-2">{dispute.description}</p>
                </div>
              ))}
              {platform?.disputesQueue.length === 0 ? <p className="body-text p-4">No open disputes.</p> : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
