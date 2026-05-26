import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { marketRateDefaults, profiles, rankings } from '@/lib/db/schema'

function audienceBand(subscribers: number | null) {
  const value = subscribers ?? 0
  if (value < 10000) return 'nano'
  if (value < 100000) return 'micro'
  return 'mid'
}

function numberParam(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function GET(request: Request) {
  const authResult = await requireAuth()

  if (authResult.error) {
    return authResult.error
  }

  const { searchParams } = new URL(request.url)
  const niche = searchParams.get('niche')
  const contentStyle = searchParams.get('contentStyle')
  const platform = searchParams.get('platform')
  const verified = searchParams.get('isVerified')
  const minAvgViews = numberParam(searchParams.get('minAvgViews'), 0)
  const page = Math.max(1, numberParam(searchParams.get('page'), 1))
  const limit = Math.min(20, Math.max(1, numberParam(searchParams.get('limit'), 20)))
  const offset = (page - 1) * limit

  const filters = [
    eq(profiles.status, 'active'),
    gte(profiles.avgViews, minAvgViews),
    niche ? eq(profiles.niche, niche) : undefined,
    contentStyle ? eq(profiles.enrichedContentStyle, contentStyle) : undefined,
    verified === 'true' ? eq(profiles.isVerified, true) : undefined,
    platform ? sql`${profiles.platforms} @> ARRAY[${platform}]::text[]` : undefined,
  ].filter(Boolean)

  const creators = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      avatarUrl: profiles.avatarUrl,
      niche: profiles.niche,
      avgViews: profiles.avgViews,
      subscribers: profiles.subscribers,
      viewSubscriberRatio: profiles.viewSubscriberRatio,
      deliveryReliabilityScore: profiles.deliveryReliabilityScore,
      enrichedSummary: profiles.enrichedSummary,
      enrichedTags: profiles.enrichedTags,
      enrichedContentStyle: profiles.enrichedContentStyle,
      platforms: profiles.platforms,
      isVerified: profiles.isVerified,
      publicSlug: profiles.publicSlug,
      rankPosition: rankings.rankPosition,
    })
    .from(profiles)
    .leftJoin(rankings, and(eq(rankings.userId, profiles.id), eq(rankings.period, 'weekly')))
    .where(and(...filters))
    .orderBy(desc(profiles.avgViews))
    .limit(limit)
    .offset(offset)

  const defaults = await db.select().from(marketRateDefaults)
  const enrichedCreators = creators.map((creator) => {
    const rate = defaults.find(
      (item) => item.niche === creator.niche && item.audienceBand === audienceBand(creator.subscribers),
    )

    return {
      ...creator,
      marketRate: rate
        ? {
            rateP25: rate.rateP25,
            rateMedian: rate.rateMedian,
            rateP75: rate.rateP75,
            source: rate.source,
          }
        : null,
    }
  })

  return NextResponse.json({
    creators: enrichedCreators,
    page,
    limit,
  })
}
