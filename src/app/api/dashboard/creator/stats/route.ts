import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { collabDeals, marketRateDefaults, profiles, rankings } from '@/lib/db/schema'

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const userId = authResult.session.user.id
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
  const [rank] = await db
    .select()
    .from(rankings)
    .where(eq(rankings.userId, userId))
    .orderBy(desc(rankings.calculatedAt))
    .limit(1)
  const deals = await db.select().from(collabDeals).where(eq(collabDeals.creatorId, userId))
  const rateBenchmarks = profile?.niche
    ? await db.select().from(marketRateDefaults).where(eq(marketRateDefaults.niche, profile.niche)).limit(1)
    : []

  const now = new Date()
  const thisMonth = monthKey(now)
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = monthKey(lastMonthDate)

  const paidDeals = deals.filter((deal) => deal.status === 'paid')
  const totalEarned = paidDeals.reduce((sum, deal) => sum + Number(deal.creatorPayout ?? 0), 0)
  const thisMonthDeals = deals.filter((deal) => monthKey(new Date(deal.createdAt)) === thisMonth).length
  const lastMonthDeals = deals.filter((deal) => monthKey(new Date(deal.createdAt)) === lastMonth).length
  const dealChangePercent =
    lastMonthDeals === 0 ? (thisMonthDeals > 0 ? 100 : 0) : Math.round(((thisMonthDeals - lastMonthDeals) / lastMonthDeals) * 100)

  return NextResponse.json({
    totalEarned,
    dealsThisMonth: thisMonthDeals,
    dealChangePercent,
    deliveryReliabilityScore: Number(profile?.deliveryReliabilityScore ?? 0),
    weeklyRank: rank?.rankPosition ?? null,
    rankScore: Number(rank?.score ?? 0),
    rateBenchmarks: rateBenchmarks[0] ?? null,
    recentDeals: deals
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map((deal) => ({
        id: deal.id,
        status: deal.status,
        amount: Number(deal.creatorPayout ?? 0),
        createdAt: deal.createdAt,
      })),
  })
}
