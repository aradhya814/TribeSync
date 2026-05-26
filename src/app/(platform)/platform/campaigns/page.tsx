'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type Campaign = {
  id: string
  title: string
  description: string | null
  niche: string | null
  budget: string | null
  status: string | null
  minAvgViews: number | null
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/campaigns')
      .then((response) => response.json() as Promise<{ campaigns: Campaign[] }>)
      .then((data) => setCampaigns(data.campaigns ?? []))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="caption">Campaigns</p>
          <h1 className="heading-1">Campaign workspace</h1>
        </div>
        <Button asChild className="bg-tribe-primary hover:bg-tribe-primary-hover">
          <Link href="/platform/campaigns/new">
            <Plus className="size-4" />
            New campaign
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Plus}
          heading="No campaigns yet"
          description="Create a campaign brief to start finding creators."
          cta={
            <Button asChild className="bg-tribe-primary hover:bg-tribe-primary-hover">
              <Link href="/platform/campaigns/new">Create campaign</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="border-hairline bg-surface">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="heading-2">{campaign.title}</h2>
                    <p className="body-text mt-2 line-clamp-2">{campaign.description ?? 'No description added.'}</p>
                  </div>
                  <span className={campaign.status === 'live' ? 'badge-active' : 'badge-pending'}>
                    {campaign.status ?? 'draft'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg bg-surface-elevated p-3">
                    <p className="caption">Budget</p>
                    <p className="font-semibold text-white">Rs {Number(campaign.budget ?? 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="rounded-lg bg-surface-elevated p-3">
                    <p className="caption">Niche</p>
                    <p className="font-semibold text-white">{campaign.niche ?? '-'}</p>
                  </div>
                  <div className="rounded-lg bg-surface-elevated p-3">
                    <p className="caption">Min views</p>
                    <p className="font-semibold text-white">{(campaign.minAvgViews ?? 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/platform/campaigns/${campaign.id}`}>Open campaign</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
