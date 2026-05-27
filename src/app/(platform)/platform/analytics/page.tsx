'use client'

import { BarChart3, BadgeIndianRupee, LockKeyhole, Target } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { MetricCard } from '@/components/dashboard/MetricCard'

type MsmeStats = {
  totalSpent: number
  campaignsRun: number
  avgDealRoi: number
  escrowActive: number
}

type Analytics = {
  monthlySpend: Array<{ month: string; spend: number }>
  campaignRows: Array<{ id: string; title: string; spend: number; deals: number; roi: number; utmCampaign: string | null; couponCode: string | null }>
  creatorRows: Array<{ id: string; name: string; avgViews: number; deals: number; spend: number }>
  marketRates: Array<{ id: string; niche: string; audienceBand: string; rateMedian: string; source: string | null }>
}

function formatInr(amount: number) {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

export default function BrandAnalyticsPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [stats, setStats] = useState<MsmeStats | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  useEffect(() => {
    setIsMounted(true)
    void Promise.all([
      fetch('/api/dashboard/msme/stats').then((response) => response.json() as Promise<MsmeStats>),
      fetch('/api/dashboard/msme/analytics').then((response) => response.json() as Promise<Analytics>),
    ]).then(([statsData, analyticsData]) => {
      setStats(statsData)
      setAnalytics(analyticsData)
    })
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <p className="caption">Brand analytics</p>
        <h1 className="heading-1">Spend and creator performance</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total spent" value={stats ? formatInr(stats.totalSpent) : undefined} icon={BadgeIndianRupee} />
        <MetricCard label="Campaigns run" value={stats?.campaignsRun} icon={Target} />
        <MetricCard label="Avg deal ROI" value={stats ? `${stats.avgDealRoi}%` : undefined} icon={BarChart3} />
        <MetricCard label="Escrow active" value={stats ? formatInr(stats.escrowActive) : undefined} icon={LockKeyhole} />
      </div>

      <section className="glass-card p-5">
        <h2 className="heading-2">Monthly spend</h2>
        {isMounted ? (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.monthlySpend ?? []}>
                <CartesianGrid stroke="#242834" />
                <XAxis dataKey="month" stroke="#8f96a3" />
                <YAxis stroke="#8f96a3" />
                <Tooltip formatter={(value) => formatInr(Number(value))} />
                <Bar dataKey="spend" fill="#EF5B5B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4 h-72 rounded-lg border border-hairline bg-surface-elevated" />
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="glass-card overflow-hidden">
          <div className="border-b border-hairline p-4">
            <h2 className="heading-2">Campaign ROI</h2>
          </div>
          <div className="divide-y divide-hairline">
            {analytics?.campaignRows.map((campaign) => (
              <div key={campaign.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto_auto]">
                <div>
                  <p className="text-sm font-semibold text-white">{campaign.title}</p>
                  <p className="caption">{campaign.utmCampaign ?? 'no UTM'} · {campaign.couponCode ?? 'no coupon'}</p>
                </div>
                <span className="body-text">{formatInr(campaign.spend)}</span>
                <span className="caption">{campaign.roi}% ROI</span>
              </div>
            ))}
            {analytics?.campaignRows.length === 0 ? <p className="body-text p-4">No campaigns yet.</p> : null}
          </div>
        </section>

        <section className="glass-card overflow-hidden">
          <div className="border-b border-hairline p-4">
            <h2 className="heading-2">Creator performance</h2>
          </div>
          <div className="divide-y divide-hairline">
            {analytics?.creatorRows.map((creator) => (
              <div key={creator.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto_auto]">
                <span className="text-sm font-semibold text-white">{creator.name}</span>
                <span className="body-text">{creator.avgViews.toLocaleString('en-IN')} avg views</span>
                <span className="caption">{creator.deals} deals · {formatInr(creator.spend)}</span>
              </div>
            ))}
            {analytics?.creatorRows.length === 0 ? <p className="body-text p-4">No creator deals yet.</p> : null}
          </div>
        </section>
      </div>

      <section className="glass-card overflow-hidden">
        <div className="border-b border-hairline p-4">
          <h2 className="heading-2">Market rate benchmarks</h2>
        </div>
        <div className="divide-y divide-hairline">
          {analytics?.marketRates.map((rate) => (
            <div key={rate.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto_auto]">
              <span className="text-sm font-semibold text-white">{rate.niche}</span>
              <span className="body-text">{rate.audienceBand}</span>
              <span className="caption">{formatInr(Number(rate.rateMedian))} median · {rate.source}</span>
            </div>
          ))}
          {analytics?.marketRates.length === 0 ? <p className="body-text p-4">No benchmarks available.</p> : null}
        </div>
      </section>
    </div>
  )
}
