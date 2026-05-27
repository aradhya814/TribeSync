'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

type Campaign = {
  id: string
  title: string
  niche: string | null
  budget: string | null
  status: string | null
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  async function loadCampaigns() {
    const response = await fetch('/api/admin/campaigns')
    const data = (await response.json()) as { campaigns?: Campaign[] }
    if (response.ok) setCampaigns(data.campaigns ?? [])
  }

  useEffect(() => {
    void loadCampaigns()
  }, [])

  async function review(id: string, action: 'approve' | 'reject') {
    const response = await fetch(`/api/admin/campaigns/${id}/${action}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: action === 'reject' ? JSON.stringify({ reason: 'Needs changes before publishing.' }) : undefined,
    })
    if (!response.ok) {
      toast.error('Campaign review failed')
      return
    }
    await loadCampaigns()
  }

  return (
    <main className="min-h-screen bg-background p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="caption">Admin</p>
          <h1 className="heading-1">Campaign review</h1>
        </div>
        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-hairline">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
                <div>
                  <p className="text-sm font-semibold text-white">{campaign.title}</p>
                  <p className="caption">{campaign.niche ?? 'general'} · Rs {Number(campaign.budget ?? 0).toLocaleString('en-IN')}</p>
                </div>
                <span className="caption">{campaign.status}</span>
                <Button variant="outline" disabled={campaign.status !== 'pending_review'} onClick={() => review(campaign.id, 'approve')}>
                  Approve
                </Button>
                <Button variant="outline" disabled={campaign.status !== 'pending_review'} onClick={() => review(campaign.id, 'reject')}>
                  Reject
                </Button>
              </div>
            ))}
            {campaigns.length === 0 ? <p className="body-text p-4">No campaigns found.</p> : null}
          </div>
        </div>
      </div>
    </main>
  )
}
