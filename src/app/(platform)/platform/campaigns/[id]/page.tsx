'use client'

import { Bot, Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { AgentActivityFeed } from '@/components/agent/AgentActivityFeed'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Campaign = {
  id: string
  title: string
  description: string | null
  goal: string | null
  niche: string | null
  budget: string | null
  status: string | null
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [isRanking, setIsRanking] = useState(false)
  const [isLaunchingAgent, setIsLaunchingAgent] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/campaigns/${params.id}`)
      .then((response) => response.json() as Promise<{ campaign: Campaign }>)
      .then((data) => setCampaign(data.campaign))
  }, [params.id])

  async function runRanking() {
    if (!campaign) return
    setIsRanking(true)
    const search = await fetch(`/api/profiles/search?niche=${campaign.niche ?? ''}&minAvgViews=0`)
    const searchData = (await search.json()) as { creators: unknown[] }
    await fetch('/api/ai/rank-creators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign, candidates: searchData.creators }),
    })
    setIsRanking(false)
    toast.success('Ranking complete')
  }

  async function launchAgent() {
    if (!campaign) return
    setIsLaunchingAgent(true)
    const response = await fetch('/api/agent/deal/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign.id }),
    })
    const result = (await response.json()) as { runId?: string; error?: string }
    setIsLaunchingAgent(false)

    if (!response.ok || !result.runId) {
      toast.error(result.error ?? 'Could not launch agent')
      return
    }

    setRunId(result.runId)
  }

  if (!campaign) {
    return <div className="glass-card p-6">Loading campaign...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="caption">Campaign</p>
          <h1 className="heading-1">{campaign.title}</h1>
          <p className="body-text mt-2">{campaign.description}</p>
        </div>
        <Button className="bg-tribe-primary hover:bg-tribe-primary-hover" onClick={runRanking} disabled={isRanking}>
          {isRanking ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
          Run AI Ranking
        </Button>
      </div>

      <div className="space-y-4">
        <Button className="bg-tribe-primary hover:bg-tribe-primary-hover" onClick={launchAgent} disabled={isLaunchingAgent}>
          {isLaunchingAgent ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
          Launch Agent
        </Button>
        {runId ? <AgentActivityFeed runId={runId} /> : null}
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="bg-surface">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applicants">Applicants</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="traceability">Traceability</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card className="border-hairline bg-surface">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
              <div>
                <p className="caption">Budget</p>
                <p className="text-xl font-bold text-white">Rs {Number(campaign.budget ?? 0).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="caption">Niche</p>
                <p className="text-xl font-bold text-white">{campaign.niche ?? '-'}</p>
              </div>
              <div>
                <p className="caption">Status</p>
                <p className="text-xl font-bold text-white">{campaign.status ?? 'draft'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="applicants">
          <div className="glass-card p-5">
            <h2 className="heading-2">Applicants</h2>
            <p className="body-text mt-2">Creator applications and AI fit scores will appear here.</p>
          </div>
        </TabsContent>
        <TabsContent value="deals">
          <div className="glass-card p-5">
            <h2 className="heading-2">Deals</h2>
            <p className="body-text mt-2">Accepted creator deals will appear here.</p>
          </div>
        </TabsContent>
        <TabsContent value="traceability">
          <div className="glass-card p-5">
            <h2 className="heading-2">Traceability</h2>
            <p className="body-text mt-2">UTM packs, coupons, and referral codes will appear here.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
