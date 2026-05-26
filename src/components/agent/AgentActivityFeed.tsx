'use client'

import { CheckCircle2, Loader2, PauseCircle, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getPusherClient } from '@/lib/pusher-client'

type AgentStep = {
  id: string
  stepKey: string
  label: string
  detail: string | null
  status: string
  outputData: {
    top5?: CreatorOption[]
    [key: string]: unknown
  } | null
  startedAt: string | null
  completedAt: string | null
}

type CreatorOption = {
  id: string
  fullName: string
  avgViews: number
  fitReason: string
  rateMedian: string | null
  rateP25: string | null
  rateP75: string | null
  deliveryReliabilityScore: string | null
}

type AgentRun = {
  id: string
  status: string | null
}

type RunResponse = {
  run: AgentRun
  steps: AgentStep[]
}

function statusIcon(status: string) {
  if (status === 'completed') return <CheckCircle2 className="size-5 text-emerald-300" />
  if (status === 'failed') return <XCircle className="size-5 text-red-300" />
  if (status === 'waiting_human') return <PauseCircle className="size-5 text-amber-300" />
  return <Loader2 className="size-5 animate-spin text-tribe-primary" />
}

function statusBadge(status: string | null) {
  if (status === 'running') return 'badge-active'
  if (status === 'waiting_human') return 'badge-pending'
  if (status === 'paused') return 'badge-draft'
  if (status === 'failed') return 'badge-disputed'
  return 'badge-paid'
}

export function AgentActivityFeed({ runId }: { runId: string }) {
  const router = useRouter()
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [runStatus, setRunStatus] = useState<string | null>('running')
  const [isApproving, setIsApproving] = useState(false)

  useEffect(() => {
    fetch(`/api/agent/runs/${runId}`)
      .then((response) => response.json() as Promise<RunResponse>)
      .then((data) => {
        setSteps(data.steps ?? [])
        setRunStatus(data.run.status)
      })

    const client = getPusherClient()
    if (!client) return

    const channel = client.subscribe(`private-agent-${runId}`)
    channel.bind('step-update', (payload: { step: AgentStep }) => {
      setSteps((current) => {
        const exists = current.some((step) => step.stepKey === payload.step.stepKey)
        if (!exists) return [...current, payload.step]
        return current.map((step) => (step.stepKey === payload.step.stepKey ? payload.step : step))
      })
    })
    channel.bind('run-complete', (payload: { run: AgentRun }) => {
      setRunStatus(payload.run.status)
    })

    return () => {
      channel.unbind_all()
      client.unsubscribe(`private-agent-${runId}`)
    }
  }, [runId])

  const top5 = useMemo(() => {
    const awaitHumanStep = steps.find((step) => step.stepKey === 'await_human')
    return awaitHumanStep?.outputData?.top5 ?? []
  }, [steps])

  async function approveCreator(creatorId: string) {
    setIsApproving(true)
    const response = await fetch(`/api/agent/runs/${runId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorId }),
    })
    const result = (await response.json()) as { dealId?: string; error?: string }
    setIsApproving(false)

    if (!response.ok || !result.dealId) {
      toast.error(result.error ?? 'Could not approve creator')
      return
    }

    router.push(`/platform/deals/${result.dealId}`)
  }

  async function pauseAgent() {
    await fetch(`/api/agent/runs/${runId}/pause`, { method: 'POST' })
    setRunStatus('paused')
  }

  return (
    <Card className="border-hairline bg-surface">
      <CardContent className="space-y-5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="heading-2">TribeSync Deal Agent</h2>
            <p className="caption">Run {runId.slice(0, 8)}</p>
          </div>
          <span className={statusBadge(runStatus)}>{runStatus ?? 'running'}</span>
        </div>

        <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
          {steps.map((step) => (
            <div
              key={step.stepKey}
              className={`grid grid-cols-[auto_1fr_auto] gap-3 rounded-lg border border-hairline p-3 ${
                step.status === 'running' ? 'bg-tribe-primary/5' : 'bg-surface-elevated'
              }`}
            >
              {statusIcon(step.status)}
              <div>
                <div className="font-semibold text-white">{step.label}</div>
                <div className="text-sm text-text-mid">{step.detail}</div>
              </div>
              <div className="caption whitespace-nowrap">
                {step.startedAt ? new Date(step.startedAt).toLocaleTimeString('en-IN') : ''}
              </div>
            </div>
          ))}
        </div>

        {runStatus === 'running' ? (
          <div className="flex gap-1">
            <span className="size-2 animate-bounce rounded-full bg-tribe-primary" />
            <span className="size-2 animate-bounce rounded-full bg-tribe-primary [animation-delay:120ms]" />
            <span className="size-2 animate-bounce rounded-full bg-tribe-primary [animation-delay:240ms]" />
          </div>
        ) : null}

        {runStatus === 'waiting_human' ? (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4">
            <h3 className="heading-3">Your decision needed</h3>
            <p className="body-text mt-1">Select a creator to initiate the deal</p>
            <div className="mt-4 space-y-3">
              {top5.map((creator, index) => (
                <div key={creator.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface p-3">
                  <div>
                    <div className="font-semibold text-white">
                      #{index + 1} {creator.fullName}
                    </div>
                    <div className="text-sm text-text-mid">
                      {creator.avgViews.toLocaleString('en-IN')} avg views · {creator.fitReason}
                    </div>
                  </div>
                  <Button
                    className="bg-tribe-primary hover:bg-tribe-primary-hover"
                    disabled={isApproving}
                    onClick={() => approveCreator(creator.id)}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
            <button className="mt-4 text-sm text-text-mid hover:text-white" onClick={pauseAgent}>
              Pause Agent
            </button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
