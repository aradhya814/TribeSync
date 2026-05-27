import { and, asc, desc, eq, gte, ilike, inArray, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { collabDeals, marketRateDefaults, profiles, rankings } from '@/lib/db/schema'

function audienceBand(avgViews: number | null) {
  const value = avgViews ?? 0
  if (value < 10000) return 'nano'
  if (value < 50000) return 'micro'
  if (value < 200000) return 'mid'
  if (value < 1000000) return 'macro'
  return 'mega'
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
  const tiers = searchParams.get('tiers')?.split(',').filter(Boolean) ?? []
  const minViews72h = numberParam(searchParams.get('minViews72h'), 0)
  const contentLanguage = searchParams.get('contentLanguage')
  const contentPurity = searchParams.get('contentPurity')
  const secondaryNiche = searchParams.get('secondaryNiche')
  const region = searchParams.get('region')
  const sponsorshipReady = searchParams.get('sponsorshipReady') === 'true'
  const sortBy = searchParams.get('sortBy') ?? 'avgViews'
  const minAvgViews = numberParam(searchParams.get('minAvgViews'), 0)
  const page = Math.max(1, numberParam(searchParams.get('page'), 1))
  const limit = Math.min(20, Math.max(1, numberParam(searchParams.get('limit'), 20)))
  const offset = (page - 1) * limit

  const filters = [
    eq(profiles.status, 'active'),
    gte(profiles.avgViews, minAvgViews),
    gte(profiles.views72h, minViews72h),
    niche ? eq(profiles.niche, niche) : undefined,
    contentStyle ? eq(profiles.enrichedContentStyle, contentStyle) : undefined,
    tiers.length > 0 ? inArray(profiles.influencerTier, tiers) : undefined,
    contentLanguage ? eq(profiles.contentLanguage, contentLanguage) : undefined,
    contentPurity ? eq(profiles.contentPurity, contentPurity) : undefined,
    secondaryNiche ? eq(profiles.secondaryNiche, secondaryNiche) : undefined,
    region ? ilike(profiles.location, `%${region}%`) : undefined,
    sponsorshipReady ? gte(profiles.sponsorshipReadiness, '0.70') : undefined,
    verified === 'true' ? eq(profiles.isVerified, true) : undefined,
    platform ? sql`${profiles.platforms} @> ARRAY[${platform}]::text[]` : undefined,
  ].filter(Boolean)

  const selectedFields = {
    id: profiles.id,
    fullName: profiles.fullName,
    avatarUrl: profiles.avatarUrl,
    niche: profiles.niche,
    secondaryNiche: profiles.secondaryNiche,
    avgViews: profiles.avgViews,
    views72h: profiles.views72h,
    contentLanguage: profiles.contentLanguage,
    contentPurity: profiles.contentPurity,
    contentMixRatio: profiles.contentMixRatio,
    sponsorshipReadiness: profiles.sponsorshipReadiness,
    influencerTier: profiles.influencerTier,
    vidiqOutlierScore: profiles.vidiqOutlierScore,
    dataSource: profiles.dataSource,
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
  }

  // For dealsClosed sort: fetch a wider set, sort + paginate in-memory
  // For all other sorts: push ordering + pagination to DB
  const needsInMemorySort = sortBy === 'dealsClosed'

  let dbOrder
  if (sortBy === 'views72h') dbOrder = desc(profiles.views72h)
  else if (sortBy === 'sponsorshipReadiness') dbOrder = desc(profiles.sponsorshipReadiness)
  else if (sortBy === 'platformRank') dbOrder = asc(rankings.rankPosition)
  else dbOrder = desc(profiles.avgViews)

  const baseQuery = db
    .select(selectedFields)
    .from(profiles)
    .leftJoin(rankings, and(eq(rankings.userId, profiles.id), eq(rankings.period, 'weekly')))
    .where(and(...filters))

  const creators = needsInMemorySort
    ? await baseQuery.limit(200)
    : await baseQuery.orderBy(dbOrder).limit(limit).offset(offset)

  // Count deals only for the creators we fetched — not a full table scan
  const creatorIds = creators.map((c) => c.id)
  const dealCountRows = creatorIds.length > 0
    ? await db
        .select({
          creatorId: collabDeals.creatorId,
          count: sql<number>`count(*)::int`,
        })
        .from(collabDeals)
        .where(inArray(collabDeals.creatorId, creatorIds))
        .groupBy(collabDeals.creatorId)
    : []

  const dealCountMap = new Map(dealCountRows.map((row) => [row.creatorId, row.count]))

  const withDeals = creators.map((creator) => ({
    ...creator,
    dealsClosed: dealCountMap.get(creator.id) ?? 0,
  }))

  const pageCreators = needsInMemorySort
    ? withDeals.sort((a, b) => b.dealsClosed - a.dealsClosed).slice(offset, offset + limit)
    : withDeals

  const defaults = await db.select().from(marketRateDefaults)
  const enrichedCreators = pageCreators.map((creator) => {
    const rate = defaults.find(
      (item) => item.niche === creator.niche && item.audienceBand === audienceBand(creator.avgViews),
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
