import { and, eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { marketRateDefaults } from '@/lib/db/schema'

type MarketRateRow = {
  niche: string
  audience_band: string
  rate_p25: string
  rate_median: string
  rate_p75: string
  deal_count: number
}

export async function GET(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const searchParams = new URL(request.url).searchParams
  const niche = searchParams.get('niche')
  const audienceBand = searchParams.get('audienceBand')

  if (!niche || !audienceBand) {
    return NextResponse.json({ error: 'niche and audienceBand are required' }, { status: 400 })
  }

  try {
    const rows = (await db.execute(sql`
      SELECT niche, audience_band, rate_p25, rate_median, rate_p75, deal_count
      FROM market_rates
      WHERE niche = ${niche} AND audience_band = ${audienceBand}
      LIMIT 1
    `)) as unknown as MarketRateRow[]

    const verified = rows[0]
    if (verified) {
      return NextResponse.json({
        rate_p25: verified.rate_p25,
        rate_median: verified.rate_median,
        rate_p75: verified.rate_p75,
        deal_count: verified.deal_count,
        source: 'verified',
      })
    }
  } catch {
    // The materialized view exists only after raw SQL migrations are applied.
  }

  const [fallback] = await db
    .select()
    .from(marketRateDefaults)
    .where(and(eq(marketRateDefaults.niche, niche), eq(marketRateDefaults.audienceBand, audienceBand)))
    .limit(1)

  if (!fallback) return NextResponse.json({ error: 'Market rate not found' }, { status: 404 })

  return NextResponse.json({
    rate_p25: fallback.rateP25,
    rate_median: fallback.rateMedian,
    rate_p75: fallback.rateP75,
    deal_count: fallback.dealCount ?? 0,
    source: fallback.source ?? 'estimated',
  })
}
