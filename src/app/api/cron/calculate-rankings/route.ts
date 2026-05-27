import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireCron } from '@/lib/api/auth-check'
import { calculateSponsorshipReadiness } from '@/lib/api/profiles'
import { db } from '@/lib/db'
import { collabDeals, competitorProfiles, outreachSignals, profiles, rankings, userRoles } from '@/lib/db/schema'

function fallbackTrustMultiplier(totalDeals: number) {
  if (totalDeals > 0) return 0.9
  return 0.7
}

export async function POST(request: Request) {
  const cronError = requireCron(request)
  if (cronError) return cronError

  const [activeProfiles, roles, deals, oldWeekly] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.status, 'active')),
    db.select().from(userRoles),
    db.select().from(collabDeals),
    db.select().from(rankings).where(eq(rankings.period, 'weekly')),
  ])

  const creators = activeProfiles.filter((profile) => roles.find((role) => role.userId === profile.id)?.role === 'creator')
  const maxAvgViews = Math.max(1, ...creators.map((creator) => creator.avgViews ?? 0))
  const maxViewRatio = Math.max(1, ...creators.map((creator) => Number(creator.viewSubscriberRatio ?? 0)))
  const oldRankByUser = new Map(oldWeekly.map((rank) => [rank.userId, rank.rankPosition]))

  const scored = creators
    .map((creator) => {
      const creatorDeals = deals.filter((deal) => deal.creatorId === creator.id)
      const completedDeals = creatorDeals.filter(
        (deal) => deal.status === 'completed' || deal.status === 'invoiced' || deal.status === 'paid',
      )
      const recentDeal = creatorDeals.some((deal) => Date.now() - new Date(deal.createdAt).getTime() < 60 * 24 * 60 * 60 * 1000)
      const avgViewsScore = ((creator.avgViews ?? 0) / maxAvgViews) * 100
      const viewRatioScore = (Number(creator.viewSubscriberRatio ?? 0) / maxViewRatio) * 100
      const completionScore = creatorDeals.length > 0 ? (completedDeals.length / creatorDeals.length) * 100 : 0
      const recencyScore = recentDeal ? 100 : 20
      const sponsorshipReadiness = calculateSponsorshipReadiness(creator)
      const rawScore =
        avgViewsScore * 0.35 +
        viewRatioScore * 0.25 +
        completionScore * 0.2 +
        recencyScore * 0.1 +
        sponsorshipReadiness * 100 * 0.1
      const multiplier = Number(creator.trustMultiplier ?? fallbackTrustMultiplier(creatorDeals.length))
      const score = Math.round(rawScore * multiplier * 10)

      return { creator, score, completionScore, sponsorshipReadiness }
    })
    .sort((a, b) => b.score - a.score)

  for (let index = 0; index < scored.length; index += 1) {
    const item = scored[index]
    const rankPosition = index + 1
    await db
      .insert(rankings)
      .values({
        userId: item.creator.id,
        period: 'weekly',
        niche: item.creator.niche,
        rankPosition,
        score: String(item.score),
        calculatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [rankings.userId, rankings.period, rankings.niche],
        set: {
          rankPosition,
          score: String(item.score),
          calculatedAt: new Date(),
        },
      })

    await db
      .update(profiles)
      .set({
        deliveryReliabilityScore: String(Math.round(item.completionScore * 100) / 100),
        sponsorshipReadiness: item.sponsorshipReadiness.toFixed(2),
      })
      .where(eq(profiles.id, item.creator.id))

    const oldRank = oldRankByUser.get(item.creator.id)
    if (oldRank && oldRank - rankPosition >= 5) {
      const watchers = await db
        .select()
        .from(competitorProfiles)
        .where(eq(competitorProfiles.subjectId, item.creator.id))

      for (const watcher of watchers) {
        await db.insert(outreachSignals).values({
          forUserId: watcher.watcherId,
          creatorId: item.creator.id,
          signalType: 'ranking_jump',
          signalData: {
            oldRank,
            newRank: rankPosition,
            jump: oldRank - rankPosition,
            niche: item.creator.niche,
          },
          suggestedMessage: `Your rank jumped from #${oldRank} to #${rankPosition}. Open to discussing a campaign while momentum is strong?`,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        })
      }
    }
  }

  return NextResponse.json({ rankedCreators: scored.length })
}
