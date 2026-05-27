'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

type Chronicle = {
  id: string
  month: string
  title: string | null
  metrics: Record<string, unknown> | null
  insights: string[] | null
  generatedAt: string | null
}

export default function ChroniclePage() {
  const [chronicles, setChronicles] = useState<Chronicle[]>([])

  async function loadChronicles() {
    const response = await fetch('/api/growth/chronicles')
    const data = (await response.json()) as { chronicles?: Chronicle[] }
    if (response.ok) setChronicles(data.chronicles ?? [])
  }

  useEffect(() => {
    void loadChronicles()
  }, [])

  async function generateNow() {
    const response = await fetch('/api/growth/chronicles', { method: 'POST' })
    if (!response.ok) {
      toast.error('Could not generate chronicle')
      return
    }
    toast.success('Chronicle generated')
    await loadChronicles()
  }

  const current = chronicles[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="caption">Growth</p>
          <h1 className="heading-1">Chronicle</h1>
        </div>
        <Button className="bg-tribe-primary hover:bg-tribe-primary-hover" onClick={generateNow}>
          Generate now
        </Button>
      </div>

      {current ? (
        <section className="glass-card-elevated p-6">
          <p className="caption">{current.month}</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{current.title}</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {Object.entries(current.metrics ?? {}).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-hairline bg-surface p-3">
                <p className="metric-label">{key}</p>
                <p className="text-xl font-bold text-white">{String(value)}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {current.insights?.map((insight) => (
              <p key={insight} className="body-text">{insight}</p>
            ))}
          </div>
        </section>
      ) : (
        <div className="glass-card p-5"><p className="body-text">No chronicle yet.</p></div>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {chronicles.slice(1).map((chronicle) => (
          <div key={chronicle.id} className="glass-card p-5">
            <p className="caption">{chronicle.month}</p>
            <h3 className="mt-2 text-base font-semibold text-white">{chronicle.title}</h3>
          </div>
        ))}
      </section>
    </div>
  )
}
