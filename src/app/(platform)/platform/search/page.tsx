'use client'

import { CheckCircle2, Eye, Loader2, Search, Sparkles, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { type FormEvent, useState } from 'react'

import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Creator = {
  id: string
  fullName: string | null
  avatarUrl: string | null
  niche: string | null
  avgViews: number | null
  views72h: number | null
  contentLanguage: string | null
  contentPurity: string | null
  sponsorshipReadiness: string | null
  influencerTier: string | null
  subscribers: number | null
  enrichedSummary: string | null
  enrichedTags: string[] | null
  platforms: string[] | null
  isVerified: boolean | null
  publicSlug: string | null
  status: string | null
  rankPosition: number | null
  marketRate: { rateMedian: string; source: string | null } | null
}

type DiscoverResponse = {
  creators: Creator[]
  niche: string
}

const tierStyles: Record<string, string> = {
  nano: 'bg-zinc-500/15 text-zinc-200 border-zinc-400/20',
  micro: 'bg-blue-500/15 text-blue-300 border-blue-400/20',
  mid: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
  macro: 'bg-amber-500/15 text-amber-300 border-amber-400/20',
  mega: 'bg-tribe-primary/15 text-tribe-primary border-tribe-primary/30',
}

const languageLabels: Record<string, string> = {
  en: 'EN', hi: 'HI', ta: 'TA', te: 'TE', mixed: 'Mixed', regional: 'Regional',
}

function compactNumber(value: number | null) {
  const n = value ?? 0
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

function tierStyle(tier: string | null) {
  return tierStyles[tier ?? ''] ?? 'bg-surface-elevated text-text-mid border-hairline'
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
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function CreatorDiscoveryPage() {
  const [niche, setNiche] = useState('')
  const [budget, setBudget] = useState('')
  const [language, setLanguage] = useState('all')
  const [creators, setCreators] = useState<Creator[]>([])
  const [searchedNiche, setSearchedNiche] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function discover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!niche.trim()) return

    setIsLoading(true)
    setCreators([])
    setSearchedNiche(null)

    const response = await fetch('/api/profiles/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        niche: niche.trim(),
        budget: budget ? Number(budget) : undefined,
        language: language !== 'all' ? language : undefined,
      }),
    })

    setIsLoading(false)

    if (!response.ok) {
      setCreators([])
      setSearchedNiche(niche.trim())
      return
    }

    const data = (await response.json()) as DiscoverResponse
    setCreators(data.creators)
    setSearchedNiche(data.niche)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="caption">Creator discovery</p>
        <h1 className="heading-1">Find creators for your campaign</h1>
      </div>

      <form onSubmit={discover} className="glass-card space-y-4 p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="niche">Niche or keyword</Label>
            <Input
              id="niche"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. tech, finance Hindi, fitness"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget">Budget (₹)</Label>
            <Input
              id="budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              inputMode="numeric"
              placeholder="Optional"
              className="w-36"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
                <SelectItem value="ta">Tamil</SelectItem>
                <SelectItem value="te">Telugu</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
                <SelectItem value="regional">Regional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              className="bg-tribe-primary hover:bg-tribe-primary-hover"
              disabled={isLoading || !niche.trim()}
            >
              {isLoading
                ? <><Loader2 className="size-4 animate-spin" /> Finding...</>
                : <><Sparkles className="size-4" /> Find Creators</>}
            </Button>
          </div>
        </div>
      </form>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CreatorSkeleton key={i} />)}
        </div>
      ) : searchedNiche === null ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Search className="size-10 text-text-dim" />
          <p className="text-text-mid">Enter a niche to discover your best creator matches.</p>
        </div>
      ) : creators.length === 0 ? (
        <EmptyState
          icon={Search}
          heading="No creators found"
          description={`No creators found for "${searchedNiche}". Try a broader keyword or a different language.`}
          cta={
            <Button
              className="bg-tribe-primary hover:bg-tribe-primary-hover"
              onClick={() => { setSearchedNiche(null); setNiche('') }}
            >
              New search
            </Button>
          }
        />
      ) : (
        <>
          <p className="caption">
            {creators.length} creator{creators.length !== 1 ? 's' : ''} matched for &ldquo;{searchedNiche}&rdquo;
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {creators.map((creator) => (
              <Card key={creator.id} className="border-hairline bg-surface">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-sm font-semibold text-white">
                        {(creator.fullName ?? 'TS').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white">
                          {creator.fullName ?? 'Unnamed creator'}
                        </div>
                        <div className="caption">{creator.niche ?? 'General'}</div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge className={cn('border uppercase', tierStyle(creator.influencerTier))}>
                        {creator.influencerTier ?? 'tier'}
                      </Badge>
                      {creator.isVerified ? (
                        <Badge className="bg-tribe-primary text-white">Verified</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <p className="metric-label">Avg views</p>
                    <p className="text-3xl font-bold text-white">{compactNumber(creator.avgViews)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Number(creator.sponsorshipReadiness ?? 0) >= 0.7 ? (
                      <Badge className="border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                        <CheckCircle2 className="size-3" />
                        Sponsorship Ready
                      </Badge>
                    ) : null}
                    {creator.contentLanguage ? (
                      <Badge className="border border-hairline bg-surface-elevated text-text-mid">
                        {languageLabels[creator.contentLanguage] ?? creator.contentLanguage.toUpperCase()}
                      </Badge>
                    ) : null}
                    {creator.status === 'pending' ? (
                      <Badge className="border border-tribe-primary/30 bg-tribe-primary/10 text-tribe-primary">
                        New
                      </Badge>
                    ) : null}
                  </div>

                  <p className="line-clamp-2 min-h-10 text-sm text-text-mid">
                    {creator.enrichedSummary ?? 'Profile enrichment pending.'}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {(creator.enrichedTags ?? []).slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-surface-elevated px-2 py-1 text-xs text-text-mid">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {creator.marketRate ? (
                    <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">
                      Market rate ~₹{Number(creator.marketRate.rateMedian).toLocaleString('en-IN')}
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
        </>
      )}
    </div>
  )
}
