'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type Dispute = {
  id: string
  disputeType: string
  description: string
  status: string | null
  createdAt: string
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [winner, setWinner] = useState<'brand' | 'creator' | 'split'>('split')
  const [resolution, setResolution] = useState('Resolved by admin review.')

  async function loadDisputes() {
    const response = await fetch('/api/admin/disputes')
    const data = (await response.json()) as { disputes?: Dispute[] }
    if (response.ok) setDisputes(data.disputes ?? [])
  }

  useEffect(() => {
    void loadDisputes()
  }, [])

  async function resolve(id: string) {
    const response = await fetch(`/api/admin/disputes/${id}/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner, resolution }),
    })
    if (!response.ok) {
      toast.error('Dispute resolution failed')
      return
    }
    await loadDisputes()
  }

  return (
    <main className="min-h-screen bg-background p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="caption">Admin</p>
          <h1 className="heading-1">Disputes</h1>
        </div>
        <div className="glass-card p-4">
          <div className="grid gap-3 md:grid-cols-[180px_1fr]">
            <Select value={winner} onValueChange={(value) => setWinner(value as 'brand' | 'creator' | 'split')}>
              <SelectTrigger className="border-hairline bg-background text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand">Brand wins</SelectItem>
                <SelectItem value="creator">Creator wins</SelectItem>
                <SelectItem value="split">Split</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={resolution} onChange={(event) => setResolution(event.target.value)} />
          </div>
        </div>
        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-hairline">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                <div>
                  <p className="text-sm font-semibold text-white">{dispute.disputeType}</p>
                  <p className="body-text mt-1">{dispute.description}</p>
                </div>
                <span className="caption">{dispute.status}</span>
                <Button variant="outline" disabled={dispute.status === 'resolved'} onClick={() => resolve(dispute.id)}>
                  Resolve
                </Button>
              </div>
            ))}
            {disputes.length === 0 ? <p className="body-text p-4">No disputes found.</p> : null}
          </div>
        </div>
      </div>
    </main>
  )
}
