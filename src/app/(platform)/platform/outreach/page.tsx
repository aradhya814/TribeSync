'use client'

import { Send, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type SignalRecord = {
  signal: {
    id: string
    signalType: string
    signalData: Record<string, unknown> | null
    suggestedMessage: string | null
    createdAt: string | null
  }
  creator: {
    id: string
    fullName: string | null
    email: string
    niche: string | null
    avgViews: number | null
  }
}

type OutreachLog = {
  id: string
  recipientEmail: string | null
  subject: string | null
  message: string
  status: string | null
  sentAt: string | null
}

type OutreachStats = {
  sent: number
  replied: number
  responseRate: number
}

function formatSignal(type: string) {
  return type.replaceAll('_', ' ')
}

export default function OutreachPage() {
  const [signals, setSignals] = useState<SignalRecord[]>([])
  const [logs, setLogs] = useState<OutreachLog[]>([])
  const [stats, setStats] = useState<OutreachStats>({ sent: 0, replied: 0, responseRate: 0 })
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [signalsResponse, historyResponse] = await Promise.all([fetch('/api/signals'), fetch('/api/outreach')])
    const signalsData = (await signalsResponse.json()) as { signals?: SignalRecord[]; error?: string }
    const historyData = (await historyResponse.json()) as { logs?: OutreachLog[]; stats?: OutreachStats; error?: string }

    if (signalsResponse.ok) setSignals(signalsData.signals ?? [])
    if (historyResponse.ok) {
      setLogs(historyData.logs ?? [])
      setStats(historyData.stats ?? { sent: 0, replied: 0, responseRate: 0 })
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function sendSignal(signalId: string) {
    setBusyId(signalId)
    const response = await fetch(`/api/signals/${signalId}/send`, { method: 'POST' })
    const data = (await response.json()) as { provider?: string; error?: string }
    setBusyId(null)

    if (!response.ok) {
      toast.error(data.error ?? 'Could not send outreach')
      return
    }

    toast.success(`Outreach sent via ${data.provider ?? 'email'}`)
    await loadData()
  }

  async function dismissSignal(signalId: string) {
    setBusyId(signalId)
    const response = await fetch(`/api/signals/${signalId}/dismiss`, { method: 'PATCH' })
    const data = (await response.json()) as { error?: string }
    setBusyId(null)

    if (!response.ok) {
      toast.error(data.error ?? 'Could not dismiss signal')
      return
    }

    setSignals((current) => current.filter((item) => item.signal.id !== signalId))
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="caption">Outreach</p>
        <h1 className="heading-1">Signals and history</h1>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="heading-2">Outreach Signals</h2>
          <Badge className="bg-tribe-primary/15 text-tribe-primary">{signals.length} active</Badge>
        </div>

        {signals.length === 0 ? (
          <div className="glass-card p-5">
            <p className="body-text">No active signals right now.</p>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {signals.map((item) => (
            <div key={item.signal.id} className="glass-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge className="bg-blue-500/15 text-blue-300">{formatSignal(item.signal.signalType)}</Badge>
                  <h3 className="mt-3 text-lg font-semibold text-white">{item.creator.fullName ?? item.creator.email}</h3>
                  <p className="caption">
                    {item.creator.niche ?? 'general'} · Avg views {(item.creator.avgViews ?? 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => dismissSignal(item.signal.id)} disabled={busyId === item.signal.id}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <p className="body-text mt-4">{item.signal.suggestedMessage ?? 'No draft generated yet.'}</p>
              <div className="mt-4 flex gap-3">
                <Button
                  className="bg-tribe-primary hover:bg-tribe-primary-hover"
                  onClick={() => sendSignal(item.signal.id)}
                  disabled={busyId === item.signal.id}
                >
                  <Send className="size-4" />
                  Send This
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="metric-card">
            <p className="metric-label">Sent</p>
            <p className="metric-value">{stats.sent}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Replies</p>
            <p className="metric-value">{stats.replied}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Response rate</p>
            <p className="metric-value">{stats.responseRate}%</p>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="border-b border-hairline p-4">
            <h2 className="heading-2">Outreach History</h2>
          </div>
          <div className="divide-y divide-hairline">
            {logs.map((log) => (
              <div key={log.id} className="grid gap-2 p-4 md:grid-cols-[1fr_1fr_auto]">
                <p className="text-sm font-semibold text-white">{log.subject ?? 'Untitled outreach'}</p>
                <p className="body-text">{log.recipientEmail ?? 'No recipient'}</p>
                <span className="caption">{log.status ?? 'sent'} · {log.sentAt ? new Date(log.sentAt).toLocaleDateString('en-IN') : '-'}</span>
              </div>
            ))}
            {logs.length === 0 ? <p className="body-text p-4">No outreach logged yet.</p> : null}
          </div>
        </div>
      </section>
    </div>
  )
}
