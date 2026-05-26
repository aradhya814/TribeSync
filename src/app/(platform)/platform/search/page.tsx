'use client'

import { Eye, Search, SlidersHorizontal, UserPlus } from 'lucide-react'
import Link from 'next/link'
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

type CreatorSearchResult = {
  id: string
  fullName: string | null
  avatarUrl: string | null
  niche: string | null
  avgViews: number | null
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

function formatNumber(value: number | null) {
  return (value ?? 0).toLocaleString('en-IN')
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
  const [data, setData] = useState<CreatorSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  const verified = searchParams.get('isVerified') === 'true'

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

      <section className="glass-card grid gap-4 p-4 md:grid-cols-5">
        <div className="space-y-2">
          <Label>Niche</Label>
          <Select value={searchParams.get('niche') ?? 'all'} onValueChange={(value) => updateFilter('niche', value === 'all' ? null : value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
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
          <Label htmlFor="minAvgViews">Min avg views</Label>
          <Input
            id="minAvgViews"
            defaultValue={searchParams.get('minAvgViews') ?? ''}
            inputMode="numeric"
            placeholder="8000"
            onBlur={(event) => updateFilter('minAvgViews', event.currentTarget.value || null)}
          />
        </div>

        <div className="space-y-2">
          <Label>Platform</Label>
          <Select value={searchParams.get('platform') ?? 'all'} onValueChange={(value) => updateFilter('platform', value === 'all' ? null : value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Content style</Label>
          <Select
            value={searchParams.get('contentStyle') ?? 'all'}
            onValueChange={(value) => updateFilter('contentStyle', value === 'all' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All styles</SelectItem>
              <SelectItem value="tutorial">Tutorial</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="storytelling">Storytelling</SelectItem>
              <SelectItem value="comedy">Comedy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end justify-between gap-3 rounded-lg border border-hairline bg-surface-elevated px-3 py-2">
          <div>
            <Label>Verified only</Label>
            <p className="caption">Admin checked</p>
          </div>
          <Switch checked={verified} onCheckedChange={(checked) => updateFilter('isVerified', checked ? 'true' : null)} />
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
                  {creator.isVerified ? <Badge className="bg-tribe-primary text-white">Verified</Badge> : null}
                </div>

                <div>
                  <p className="metric-label">Avg views</p>
                  <p className="text-3xl font-bold text-white">{formatNumber(creator.avgViews)}</p>
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
