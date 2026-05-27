'use client'

import { CheckCircle2, Eye, Search, SlidersHorizontal, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type CreatorSearchResult = {
  id: string
  fullName: string | null
  avatarUrl: string | null
  niche: string | null
  secondaryNiche: string | null
  avgViews: number | null
  views72h: number | null
  contentLanguage: string | null
  contentPurity: string | null
  contentMixRatio: string | null
  sponsorshipReadiness: string | null
  influencerTier: string | null
  vidiqOutlierScore: string | null
  dataSource: string | null
  subscribers: number | null
  viewSubscriberRatio: string | null
  deliveryReliabilityScore: string | null
  enrichedSummary: string | null
  enrichedTags: string[] | null
  enrichedContentStyle: string | null
  platforms: string[] | null
  isVerified: boolean | null
  publicSlug: string | null
  rankPosition: number | null
  dealsClosed: number
  marketRate: {
    rateP25: string
    rateMedian: string
    rateP75: string
    source: string | null
  } | null
}

type SearchResponse = {
  creators: CreatorSearchResult[]
}

type AcquisitionResult = {
  profileId: string
  channelId: string
  title: string
  niche: string
  subscribers: number
  avgViews: number
  views72h: number
  outlierScore: number | null
  source: 'vidiq' | 'youtube'
  imported: boolean
}

const tierOptions = [
  { value: 'nano', label: 'Nano', range: '<10K views', className: 'bg-zinc-500/15 text-zinc-200 border-zinc-400/20' },
  { value: 'micro', label: 'Micro', range: '10K-50K', className: 'bg-blue-500/15 text-blue-300 border-blue-400/20' },
  { value: 'mid', label: 'Mid', range: '50K-200K', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20' },
  { value: 'macro', label: 'Macro', range: '200K-1M', className: 'bg-amber-500/15 text-amber-300 border-amber-400/20' },
  { value: 'mega', label: 'Mega', range: '1M+', className: 'bg-tribe-primary/15 text-tribe-primary border-tribe-primary/30' },
]

const languageLabels: Record<string, string> = {
  en: 'EN',
  hi: 'HI',
  ta: 'TA',
  te: 'TE',
  mixed: 'Mixed',
  regional: 'Regional',
}

function formatNumber(value: number | null) {
  return (value ?? 0).toLocaleString('en-IN')
}

function compactNumber(value: number | null) {
  const number = value ?? 0
  if (number >= 1000000) return `${Math.round(number / 100000) / 10}M`
  if (number >= 1000) return `${Math.round(number / 1000)}K`
  return String(number)
}

function tierClass(tier: string | null) {
  return tierOptions.find((option) => option.value === tier)?.className ?? 'bg-surface-elevated text-text-mid border-hairline'
}

function contentTypeLabel(creator: CreatorSearchResult) {
  if (creator.contentPurity === 'mixed') {
    const primary = creator.niche ?? 'General'
    const secondary = creator.secondaryNiche ?? 'Lifestyle'
    const ratio = creator.contentMixRatio ? ` (${creator.contentMixRatio})` : ''
    return `Mixed: ${primary} + ${secondary}${ratio}`
  }

  if (creator.contentPurity === 'regional') {
    return `Regional ${creator.niche ?? 'content'}`
  }

  return `Pure ${creator.niche ?? 'content'}`
}

function budgetSuggestion(budget: number) {
  if (budget <= 0) return null
  if (budget <= 1000000) return { label: 'Nano + Micro', tiers: 'nano,micro', minAvgViews: '1000', copy: '1K-50K avg views' }
  if (budget <= 3000000) return { label: 'Micro + Mid', tiers: 'micro,mid', minAvgViews: '10000', copy: '10K-200K avg views' }
  if (budget <= 7500000) return { label: 'Mid + Macro', tiers: 'mid,macro', minAvgViews: '50000', copy: '50K-1M avg views' }
  return { label: 'Macro + Mega', tiers: 'macro,mega', minAvgViews: '200000', copy: '200K+ avg views' }
}

function setParam(params: URLSearchParams, key: string, value: string | null) {
  if (value) {
    params.set(key, value)
  } else {
    params.delete(key)
  }
}

function CreatorSkeleton() {
  return (
    <Card className="border-hairline bg-surface">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function CreatorSearchPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const [data, setData] = useState<CreatorSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [acquisitionNiche, setAcquisitionNiche] = useState(searchParams.get('niche') ?? 'tech')
  const [acquisitionResults, setAcquisitionResults] = useState<AcquisitionResult[]>([])
  const [isAcquiring, setIsAcquiring] = useState(false)
  const [sourceUsed, setSourceUsed] = useState<'vidiq' | 'youtube' | null>(null)

  const queryString = useMemo(() => searchParams.toString(), [searchParams])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)

    fetch(`/api/profiles/search?${queryString}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<SearchResponse>)
      .then((result) => setData(result.creators ?? []))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          setData([])
        }
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [queryString])

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    setParam(params, key, value)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  function updateFilters(values: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(values)) {
      setParam(params, key, value)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  function toggleTier(tier: string) {
    const selected = new Set((searchParams.get('tiers') ?? '').split(',').filter(Boolean))
    if (selected.has(tier)) {
      selected.delete(tier)
    } else {
      selected.add(tier)
    }
    updateFilter('tiers', Array.from(selected).join(',') || null)
  }

  async function runAcquisitionSearch(source: 'vidiq' | 'youtube') {
    setIsAcquiring(true)
    setSourceUsed(null)
    const response = await fetch('/api/admin/acquisition/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche: acquisitionNiche, source, limit: 10 }),
    })
    const result = (await response.json()) as { creators?: AcquisitionResult[]; sourceUsed?: 'vidiq' | 'youtube'; error?: string }
    setIsAcquiring(false)

    if (!response.ok) {
      setAcquisitionResults([])
      setSourceUsed(null)
      return
    }

    setAcquisitionResults(result.creators ?? [])
    setSourceUsed(result.sourceUsed ?? source)
  }

  const verified = searchParams.get('isVerified') === 'true'
  const sponsorshipReady = searchParams.get('sponsorshipReady') === 'true'
  const selectedTiers = new Set((searchParams.get('tiers') ?? '').split(',').filter(Boolean))
  const budget = Number(searchParams.get('budget') ?? 0)
  const suggestedTier = budgetSuggestion(budget)
  const contentPurity = searchParams.get('contentPurity') ?? 'all'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="caption">Creator discovery</p>
          <h1 className="heading-1">Find creators by average views</h1>
        </div>
        <Button className="bg-tribe-primary hover:bg-tribe-primary-hover">
          <SlidersHorizontal className="size-4" />
          Save filter
        </Button>
      </div>

      {isAdmin ? <section className="glass-card space-y-4 p-4">
        <div>
          <p className="caption">Admin acquisition</p>
          <h2 className="heading-2">Find breakout creators before they join TribeSync</h2>
        </div>
        <Tabs defaultValue="vidiq" className="space-y-4">
          <TabsList className="bg-surface">
            <TabsTrigger value="vidiq">vidIQ Trends</TabsTrigger>
            <TabsTrigger value="youtube">YouTube Search</TabsTrigger>
          </TabsList>
          {(['vidiq', 'youtube'] as const).map((source) => (
            <TabsContent key={source} value={source} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Input
                  value={acquisitionNiche}
                  onChange={(event) => setAcquisitionNiche(event.target.value)}
                  placeholder="Search niche keyword, e.g. tech laptops, finance Hindi"
                />
                <Button
                  className="bg-tribe-primary hover:bg-tribe-primary-hover"
                  onClick={() => runAcquisitionSearch(source)}
                  disabled={isAcquiring || acquisitionNiche.length < 2}
                >
                  {isAcquiring ? 'Searching...' : source === 'vidiq' ? 'Import vidIQ Trends' : 'Search YouTube'}
                </Button>
              </div>
              {sourceUsed ? <p className="caption">Source used: {sourceUsed === 'vidiq' ? 'vidIQ outlier score + velocity' : 'YouTube API fallback'}</p> : null}
              {acquisitionResults.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {acquisitionResults.map((creator) => (
                    <div key={creator.profileId} className="rounded-lg border border-hairline bg-surface-elevated p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{creator.title}</p>
                          <p className="caption">{creator.niche} · {creator.imported ? 'new pending profile' : 'updated pending profile'}</p>
                        </div>
                        <Badge className={creator.source === 'vidiq' ? 'bg-tribe-primary text-white' : 'bg-blue-500/15 text-blue-300'}>
                          {creator.source}
                        </Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="caption">Outlier</p>
                          <p className="font-semibold text-white">{creator.outlierScore?.toFixed(1) ?? '-'}</p>
                        </div>
                        <div>
                          <p className="caption">72h</p>
                          <p className="font-semibold text-white">{compactNumber(creator.views72h)}</p>
                        </div>
                        <div>
                          <p className="caption">Avg views</p>
                          <p className="font-semibold text-white">{compactNumber(creator.avgViews)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>
      </section> : null}

      <section className="glass-card space-y-5 p-4">
        <div className="space-y-3">
          <p className="caption">Primary filters</p>
          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
            <div className="space-y-2">
              <Label>Influencer Tier</Label>
              <div className="grid gap-2 sm:grid-cols-5">
                {tierOptions.map((tier) => (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => toggleTier(tier.value)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left transition',
                      selectedTiers.has(tier.value) ? tier.className : 'border-hairline bg-surface-elevated text-text-mid',
                    )}
                  >
                    <span className="block text-sm font-semibold">{tier.label}</span>
                    <span className="caption">{tier.range}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minViews72h">Min Views in 72 Hours</Label>
              <Input
                id="minViews72h"
                defaultValue={searchParams.get('minViews72h') ?? ''}
                inputMode="numeric"
                placeholder="80000"
                onBlur={(event) => updateFilter('minViews72h', event.currentTarget.value || null)}
              />
              <p className="caption">The 80K benchmark: creators who hit 80K+ in 72h are sponsorship-ready</p>
            </div>

            <div className="space-y-2">
              <Label>Budget Smart Suggest</Label>
              {suggestedTier ? (
                <div className="rounded-lg border border-tribe-primary/30 bg-tribe-primary/10 p-3">
                  <p className="text-sm text-white">
                    For Rs {budget.toLocaleString('en-IN')} budget, we suggest {suggestedTier.label} tier creators.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 bg-tribe-primary hover:bg-tribe-primary-hover"
                    onClick={() => updateFilters({ tiers: suggestedTier.tiers, minAvgViews: suggestedTier.minAvgViews })}
                  >
                    Apply filter
                  </Button>
                </div>
              ) : (
                <p className="caption rounded-lg border border-hairline bg-surface-elevated p-3">Open from a campaign with budget to see tier guidance.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="caption">Audience filters</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Content Language</Label>
              <Select value={searchParams.get('contentLanguage') ?? 'all'} onValueChange={(value) => updateFilter('contentLanguage', value === 'all' ? null : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All languages</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="ta">Tamil</SelectItem>
                  <SelectItem value="te">Telugu</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                </SelectContent>
              </Select>
              <p className="caption">Filter by the language your target audience speaks</p>
            </div>

            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={contentPurity} onValueChange={(value) => updateFilter('contentPurity', value === 'all' ? null : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All content types</SelectItem>
                  <SelectItem value="pure">Pure Niche (100%)</SelectItem>
                  <SelectItem value="mixed">Mixed Content</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {contentPurity === 'mixed' ? (
              <div className="space-y-2">
                <Label>Secondary Niche</Label>
                <Select value={searchParams.get('secondaryNiche') ?? 'all'} onValueChange={(value) => updateFilter('secondaryNiche', value === 'all' ? null : value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any secondary niche</SelectItem>
                    <SelectItem value="tech">Tech</SelectItem>
                    <SelectItem value="fashion">Fashion</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="fitness">Fitness</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {contentPurity === 'regional' ? (
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input id="region" defaultValue={searchParams.get('region') ?? ''} onBlur={(event) => updateFilter('region', event.currentTarget.value || null)} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <p className="caption">Performance filters</p>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <div className="space-y-2">
              <Label>Niche</Label>
              <Select value={searchParams.get('niche') ?? 'all'} onValueChange={(value) => updateFilter('niche', value === 'all' ? null : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All niches</SelectItem>
                  <SelectItem value="tech">Tech</SelectItem>
                  <SelectItem value="fashion">Fashion</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="fitness">Fitness</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minAvgViews">Min Avg Views</Label>
              <Input
                id="minAvgViews"
                defaultValue={searchParams.get('minAvgViews') ?? ''}
                inputMode="numeric"
                placeholder="8000"
                onBlur={(event) => updateFilter('minAvgViews', event.currentTarget.value || null)}
              />
              <p className="caption">All-time average</p>
            </div>

            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={searchParams.get('platform') ?? 'all'} onValueChange={(value) => updateFilter('platform', value === 'all' ? null : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sort</Label>
              <Select value={searchParams.get('sortBy') ?? 'avgViews'} onValueChange={(value) => updateFilter('sortBy', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="avgViews">Avg Views</SelectItem>
                  <SelectItem value="views72h">Views in 72h</SelectItem>
                  <SelectItem value="sponsorshipReadiness">Sponsorship Readiness</SelectItem>
                  <SelectItem value="platformRank">Platform Rank</SelectItem>
                  <SelectItem value="dealsClosed">Deals Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end justify-between gap-3 rounded-lg border border-hairline bg-surface-elevated px-3 py-2">
              <div>
                <Label>Sponsorship Ready</Label>
                <p className="caption">Score &gt;= 0.70</p>
              </div>
              <Switch checked={sponsorshipReady} onCheckedChange={(checked) => updateFilter('sponsorshipReady', checked ? 'true' : null)} />
            </div>

            <div className="flex items-end justify-between gap-3 rounded-lg border border-hairline bg-surface-elevated px-3 py-2">
              <div>
                <Label>Verified only</Label>
                <p className="caption">Admin checked</p>
              </div>
              <Switch checked={verified} onCheckedChange={(checked) => updateFilter('isVerified', checked ? 'true' : null)} />
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CreatorSkeleton key={index} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Search}
          heading="No creators found"
          description="Adjust the filters or reduce the minimum average views."
          cta={<Button className="bg-tribe-primary hover:bg-tribe-primary-hover" onClick={() => router.push(pathname)}>Reset filters</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((creator) => (
            <Card key={creator.id} className="border-hairline bg-surface">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-sm font-semibold text-white">
                      {(creator.fullName ?? 'TS').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-white">{creator.fullName ?? 'Unnamed creator'}</div>
                      <div className="caption">{creator.niche ?? 'General'}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge className={cn('border uppercase', tierClass(creator.influencerTier))}>
                      {creator.influencerTier ?? 'tier'}
                    </Badge>
                    {creator.isVerified ? <Badge className="bg-tribe-primary text-white">Verified</Badge> : null}
                  </div>
                </div>

                <div>
                  <p className="metric-label">Avg views</p>
                  <p className="text-3xl font-bold text-white">{formatNumber(creator.avgViews)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {creator.views72h ? (
                    <Badge className="border border-tribe-info/30 bg-tribe-info/10 text-tribe-info">
                      72h: {compactNumber(creator.views72h)}
                    </Badge>
                  ) : null}
                  {Number(creator.sponsorshipReadiness ?? 0) >= 0.7 ? (
                    <Badge className="border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                      <CheckCircle2 className="size-3" />
                      Sponsorship Ready
                    </Badge>
                  ) : null}
                  <Badge className="border border-hairline bg-surface-elevated text-text-mid">
                    {languageLabels[creator.contentLanguage ?? ''] ?? (creator.contentLanguage ?? 'EN').toUpperCase()}
                  </Badge>
                  {Number(creator.vidiqOutlierScore ?? 0) > 0 ? (
                    <Badge className="border border-tribe-primary/30 bg-tribe-primary/10 text-tribe-primary">
                      vidIQ {Number(creator.vidiqOutlierScore).toFixed(1)}
                    </Badge>
                  ) : null}
                </div>

                <div className="rounded-lg border border-hairline bg-surface-elevated px-3 py-2 text-sm text-text-mid">
                  {contentTypeLabel(creator)}
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg bg-surface-elevated p-2">
                    <p className="caption">View ratio</p>
                    <p className="font-semibold text-white">{creator.viewSubscriberRatio ?? '0'}</p>
                  </div>
                  <div className="rounded-lg bg-surface-elevated p-2">
                    <p className="caption">Rank</p>
                    <p className="font-semibold text-white">{creator.rankPosition ? `#${creator.rankPosition}` : '-'}</p>
                  </div>
                  <div className="rounded-lg bg-surface-elevated p-2">
                    <p className="caption">Delivery</p>
                    <p className="font-semibold text-white">{creator.deliveryReliabilityScore ?? '0'}</p>
                  </div>
                </div>

                <p className="line-clamp-2 min-h-10 text-sm text-text-mid">{creator.enrichedSummary ?? 'Profile enrichment pending.'}</p>

                <div className="flex flex-wrap gap-2">
                  {(creator.enrichedTags ?? []).slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-surface-elevated px-2 py-1 text-xs text-text-mid">
                      {tag}
                    </span>
                  ))}
                </div>

                {creator.marketRate ? (
                  <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">
                    Market median Rs {Number(creator.marketRate.rateMedian).toLocaleString('en-IN')}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" asChild>
                    <Link href={creator.publicSlug ? `/c/${creator.publicSlug}` : '#'}>
                      <Eye className="size-4" />
                      View Profile
                    </Link>
                  </Button>
                  <Button className="bg-tribe-primary hover:bg-tribe-primary-hover">
                    <UserPlus className="size-4" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
