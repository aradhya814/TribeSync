'use client'

import { Bot, CheckCircle2, Loader2, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { AgentActivityFeed } from '@/components/agent/AgentActivityFeed'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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

type Creator = {
  id: string
  fullName: string | null
  niche: string | null
  avgViews: number | null
  views72h: number | null
  sponsorshipReadiness: string | null
  influencerTier: string | null
  subscribers: number | null
  enrichedSummary: string | null
  isVerified: boolean | null
  publicSlug: string | null
}

type RankResult = {
  ranked_ids: string[]
  reasons: Record<string, string>
}

function compactNumber(value: number | null) {
  const n = value ?? 0
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [creators, setCreators] = useState<Creator[]>([])
  const [rankResults, setRankResults] = useState<RankResult | null>(null)
  const [isLoadingCreators, setIsLoadingCreators] = useState(false)
  const [isRanking, setIsRanking] = useState(false)
  const [isLaunchingAgent, setIsLaunchingAgent] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/campaigns/${params.id}`)
      .then((response) => response.json() as Promise<{ campaign: Campaign }>)
      .then((data) => {
        setCampaign(data.campaign)
        // Auto-load matching creators for this campaign's niche
        if (data.campaign?.niche) {
          loadCreators(data.campaign.niche)
        }
      })
  }, [params.id])

  function loadCreators(niche: string) {
    setIsLoadingCreators(true)
    fetch(`/api/profiles/search?niche=${niche}&minAvgViews=0&limit=20`)
      .then((r) => r.json() as Promise<{ creators: Creator[] }>)
      .then((data) => setCreators(data.creators ?? []))
      .catch(() => setCreators([]))
      .finally(() => setIsLoadingCreators(false))
  }

  async function runRanking() {
    if (!campaign || creators.length === 0) {
      toast.error('No creators to rank. Run AI Ranking after creators load.')
      return
    }
    setIsRanking(true)
    const response = await fetch('/api/ai/rank-creators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign, candidates: creators }),
    })
    const result = (await response.json()) as RankResult
    setRankResults(result)
    setIsRanking(false)
    toast.success(`Ranked ${creators.length} creators`)
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
    toast.success('Agent launched!')
  }

  // Sort creators by AI rank if available
  const rankedCreators = rankResults
    ? [...creators].sort(
        (a, b) =>
          rankResults.ranked_ids.indexOf(a.id) - rankResults.ranked_ids.indexOf(b.id),
      )
    : creators

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
        <Button className="bg-tribe-primary hover:bg-tribe-primary-hover" onClick={runRanking} disabled={isRanking || creators.length === 0}>
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
          <TabsTrigger value="applicants">
            Applicants {creators.length > 0 ? `(${creators.length})` : ''}
          </TabsTrigger>
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

        <TabsContent value="applicants" className="space-y-3">
          {rankResults ? (
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
              AI ranking complete — creators sorted by fit score for this campaign.
            </div>
          ) : null}

          {isLoadingCreators ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-hairline bg-surface">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex gap-3">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rankedCreators.length === 0 ? (
            <div className="glass-card p-6 text-center">
              <p className="text-text-mid">No creators found for niche &ldquo;{campaign.niche ?? 'general'}&rdquo;.</p>
              <p className="caption mt-1">The seed data will load on the next deploy, or try a different niche.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {rankedCreators.map((creator, index) => (
                <Card key={creator.id} className="border-hairline bg-surface">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-sm font-semibold text-white">
                          {(creator.fullName ?? 'TS').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{creator.fullName ?? 'Creator'}</div>
                          <div className="caption">{creator.niche ?? 'General'}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {rankResults ? (
                          <Badge className="bg-tribe-primary/20 text-tribe-primary border border-tribe-primary/30">
                            #{index + 1}
                          </Badge>
                        ) : null}
                        {creator.isVerified ? <Badge className="bg-tribe-primary text-white">Verified</Badge> : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-lg bg-surface-elevated p-2">
                        <p className="caption">Avg views</p>
                        <p className="font-semibold text-white">{compactNumber(creator.avgViews)}</p>
                      </div>
                      <div className="rounded-lg bg-surface-elevated p-2">
                        <p className="caption">72h</p>
                        <p className="font-semibold text-white">{compactNumber(creator.views72h)}</p>
                      </div>
                      <div className="rounded-lg bg-surface-elevated p-2">
                        <p className="caption">Tier</p>
                        <p className="font-semibold text-white uppercase">{creator.influencerTier ?? '-'}</p>
                      </div>
                    </div>

                    {rankResults?.reasons[creator.id] ? (
                      <p className="text-xs text-text-mid">{rankResults.reasons[creator.id]}</p>
                    ) : creator.enrichedSummary ? (
                      <p className="line-clamp-2 text-xs text-text-mid">{creator.enrichedSummary}</p>
                    ) : null}

                    {Number(creator.sponsorshipReadiness ?? 0) >= 0.7 ? (
                      <Badge className="border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                        <CheckCircle2 className="size-3" />
                        Sponsorship Ready
                      </Badge>
                    ) : null}

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link href={creator.publicSlug ? `/c/${creator.publicSlug}` : '#'}>View</Link>
                      </Button>
                      <Button size="sm" className="flex-1 bg-tribe-primary hover:bg-tribe-primary-hover">
                        <UserPlus className="size-3" />
                        Invite
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
