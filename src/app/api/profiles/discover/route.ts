import { and, eq, inArray, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { parseJsonBody } from '@/lib/api/json'
import { importCreatorCandidates } from '@/lib/creator-acquisition'
import { db } from '@/lib/db'
import { marketRateDefaults, profiles, rankings } from '@/lib/db/schema'

const discoverSchema = z.object({
  niche: z.string().min(1).max(100),
  budget: z.number().nonnegative().optional(),
  language: z.string().optional(),
})

function audienceBand(avgViews: number | null) {
  const value = avgViews ?? 0
  if (value < 10000) return 'nano'
  if (value < 50000) return 'micro'
  if (value < 200000) return 'mid'
  if (value < 1000000) return 'macro'
  return 'mega'
}

function budgetTiers(budget: number): string[] | null {
  if (budget <= 0) return null
  if (budget <= 1000000) return ['nano', 'micro']
  if (budget <= 3000000) return ['micro', 'mid']
  if (budget <= 7500000) return ['mid', 'macro']
  return ['macro', 'mega']
}

// Composite ranking — kept server-side, never exposed to client
function compositeScore(creator: {
  vidiqOutlierScore: string | null
  views72h: number | null
  avgViews: number | null
  deliveryReliabilityScore: string | null
  sponsorshipReadiness: string | null
}) {
  const outlier = Math.min(Number(creator.vidiqOutlierScore ?? 0) / 10, 1)
  const velocity = Math.min((creator.views72h ?? 0) / 500_000, 1)
  const views = Math.min((creator.avgViews ?? 0) / 1_000_000, 1)
  const delivery = Number(creator.deliveryReliabilityScore ?? 0)
  const readiness = Number(creator.sponsorshipReadiness ?? 0)

  return (outlier * 0.35) + (velocity * 0.30) + (views * 0.15) + (delivery * 0.10) + (readiness * 0.10)
}

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const body = await parseJsonBody(request)
  if (body.error) return NextResponse.json({ error: body.error }, { status: 400 })

  const parsed = discoverSchema.safeParse(body.data)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid discovery request' }, { status: 400 })
  }

  const { niche, budget = 0, language } = parsed.data
  const tiers = budgetTiers(budget)

  // Real-time acquisition from VidIQ (YouTube fallback) — best-effort
  let acquiredIds: string[] = []
  try {
    const acquired = await importCreatorCandidates({ niche, source: 'vidiq', limit: 10 })
    acquiredIds = acquired.map((c) => c.profileId)
  } catch {
    // Serve DB-only results if acquisition fails
  }

  // Active DB creators for this niche + freshly acquired creators
  const creatorFilter = acquiredIds.length > 0
    ? or(
        and(eq(profiles.status, 'active'), eq(profiles.niche, niche)),
        inArray(profiles.id, acquiredIds),
      )
    : and(eq(profiles.status, 'active'), eq(profiles.niche, niche))

  const extraFilters = [
    language ? eq(profiles.contentLanguage, language) : undefined,
    tiers ? inArray(profiles.influencerTier, tiers) : undefined,
  ].filter(Boolean)

  const rows = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      avatarUrl: profiles.avatarUrl,
      niche: profiles.niche,
      avgViews: profiles.avgViews,
      views72h: profiles.views72h,
      contentLanguage: profiles.contentLanguage,
      contentPurity: profiles.contentPurity,
      sponsorshipReadiness: profiles.sponsorshipReadiness,
      influencerTier: profiles.influencerTier,
      vidiqOutlierScore: profiles.vidiqOutlierScore,
      subscribers: profiles.subscribers,
      deliveryReliabilityScore: profiles.deliveryReliabilityScore,
      enrichedSummary: profiles.enrichedSummary,
      enrichedTags: profiles.enrichedTags,
      platforms: profiles.platforms,
      isVerified: profiles.isVerified,
      publicSlug: profiles.publicSlug,
      status: profiles.status,
      rankPosition: rankings.rankPosition,
    })
    .from(profiles)
    .leftJoin(rankings, and(eq(rankings.userId, profiles.id), eq(rankings.period, 'weekly')))
    .where(extraFilters.length > 0 ? and(creatorFilter, ...extraFilters) : creatorFilter)
    .limit(40)

  const defaults = await db.select().from(marketRateDefaults)
  const rateMap = new Map(defaults.map((d) => [`${d.niche}:${d.audienceBand}`, d]))

  const creators = rows
    .map((creator) => {
      const rate = rateMap.get(`${creator.niche ?? ''}:${audienceBand(creator.avgViews)}`)
      return {
        id: creator.id,
        fullName: creator.fullName,
        avatarUrl: creator.avatarUrl,
        niche: creator.niche,
        avgViews: creator.avgViews,
        views72h: creator.views72h,
        contentLanguage: creator.contentLanguage,
        contentPurity: creator.contentPurity,
        sponsorshipReadiness: creator.sponsorshipReadiness,
        influencerTier: creator.influencerTier,
        subscribers: creator.subscribers,
        enrichedSummary: creator.enrichedSummary,
        enrichedTags: creator.enrichedTags,
        platforms: creator.platforms,
        isVerified: creator.isVerified,
        publicSlug: creator.publicSlug,
        status: creator.status,
        rankPosition: creator.rankPosition,
        marketRate: rate ? { rateMedian: rate.rateMedian, source: rate.source } : null,
        _score: compositeScore(creator),
      }
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 12)
    .map(({ _score, ...creator }) => creator)

  return NextResponse.json({ creators, niche })
}
