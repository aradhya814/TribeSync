'use client'

import { Bot, CalendarClock, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

type HomeFeed = {
  steps: Array<{ step: { id: string; label: string; detail: string | null; status: string; startedAt: string | null } }>
  signals: Array<{ id: string; signalType: string; suggestedMessage: string | null; createdAt: string | null }>
  upcomingMilestones: Array<{ id: string; title: string; dueDate: string | null; status: string | null }>
  pendingActions: { activeSignals: number; upcomingMilestones: number; waitingAgents: number }
}

export default function PlatformHomePage() {
  const [feed, setFeed] = useState<HomeFeed | null>(null)

  useEffect(() => {
    void fetch('/api/home/feed')
      .then((response) => response.json() as Promise<HomeFeed>)
      .then(setFeed)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <p className="caption">Home</p>
        <h1 className="heading-1">Agent activity</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="metric-card">
          <p className="metric-label">Waiting agents</p>
          <p className="metric-value">{feed?.pendingActions.waitingAgents ?? 0}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Active signals</p>
          <p className="metric-value">{feed?.pendingActions.activeSignals ?? 0}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Upcoming milestones</p>
          <p className="metric-value">{feed?.pendingActions.upcomingMilestones ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-card overflow-hidden">
          <div className="border-b border-hairline p-4">
            <h2 className="heading-2">What agents did</h2>
          </div>
          <div className="divide-y divide-hairline">
            {feed?.steps.map((item) => (
              <div key={item.step.id} className="grid gap-2 p-4 md:grid-cols-[auto_1fr_auto]">
                <Bot className="size-5 text-tribe-primary" />
                <div>
                  <p className="text-sm font-semibold text-white">{item.step.label}</p>
                  <p className="body-text">{item.step.detail}</p>
                </div>
                <span className="caption">{item.step.status}</span>
              </div>
            ))}
            {feed?.steps.length === 0 ? <p className="body-text p-4">No agent activity yet.</p> : null}
          </div>
        </section>

        <div className="space-y-5">
          <section className="glass-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="size-5 text-tribe-primary" />
              <h2 className="heading-2">Signals</h2>
            </div>
            <div className="space-y-3">
              {feed?.signals.map((signal) => (
                <div key={signal.id} className="rounded-lg border border-hairline bg-surface-elevated p-3">
                  <p className="text-sm font-semibold text-white">{signal.signalType.replaceAll('_', ' ')}</p>
                  <p className="caption mt-1">{signal.suggestedMessage}</p>
                </div>
              ))}
              {feed?.signals.length === 0 ? <p className="body-text">No signals right now.</p> : null}
            </div>
          </section>

          <section className="glass-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock className="size-5 text-tribe-primary" />
              <h2 className="heading-2">Upcoming</h2>
            </div>
            <div className="space-y-3">
              {feed?.upcomingMilestones.map((milestone) => (
                <div key={milestone.id} className="rounded-lg border border-hairline bg-surface-elevated p-3">
                  <p className="text-sm font-semibold text-white">{milestone.title}</p>
                  <p className="caption mt-1">{milestone.dueDate ?? 'No due date'} · {milestone.status}</p>
                </div>
              ))}
              {feed?.upcomingMilestones.length === 0 ? <p className="body-text">No upcoming milestones.</p> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
