import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { marketRateDefaults } from '@/lib/db/schema'

export async function GET(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const searchParams = new URL(request.url).searchParams
  const niche = searchParams.get('niche')
  const audienceBand = searchParams.get('audienceBand')

  if (!niche || !audienceBand) {
    return NextResponse.json({ error: 'niche and audienceBand are required' }, { status: 400 })
  }

  const [rate] = await db
    .select()
    .from(marketRateDefaults)
    .where(and(eq(marketRateDefaults.niche, niche), eq(marketRateDefaults.audienceBand, audienceBand)))
    .limit(1)

  if (!rate) return NextResponse.json({ error: 'Market rate not found' }, { status: 404 })

  return NextResponse.json({
    rate_p25: rate.rateP25,
    rate_median: rate.rateMedian,
    rate_p75: rate.rateP75,
    deal_count: rate.dealCount ?? 0,
    source: rate.source ?? 'estimated',
  })
}
