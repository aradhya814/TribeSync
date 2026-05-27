import { and, eq, gte, isNotNull, lt } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireCron } from '@/lib/api/auth-check'
import { callClaude } from '@/lib/claude'
import { db } from '@/lib/db'
import {
  competitorProfiles,
  crmContacts,
  outreachSignals,
  profiles,
  rankings,
  tribesyncChronicles,
  type JsonRecord,
} from '@/lib/db/schema'

async function draftSignalMessage(signalType: string, creatorName: string, signalData: JsonRecord) {
  const fallback = `Hi ${creatorName}, saw a strong TribeSync signal (${signalType.replaceAll('_', ' ')}). Open to discussing a collaboration this week?`

  try {
    return await callClaude(
      `Draft one concise creator outreach message under 90 words.
Creator: ${creatorName}
Signal type: ${signalType}
Signal data: ${JSON.stringify(signalData)}
One clear CTA. Return plain text only.`,
      { model: 'haiku', maxTokens: 220 },
    )
  } catch {
    return fallback
  }
}

async function insertSignal(forUserId: string, creatorId: string, signalType: string, signalData: JsonRecord) {
  const [creator] = await db.select().from(profiles).where(eq(profiles.id, creatorId)).limit(1)
  if (!creator) return false

  const suggestedMessage = await draftSignalMessage(signalType, creator.fullName ?? creator.email, signalData)

  await db.insert(outreachSignals).values({
    forUserId,
    creatorId,
    signalType,
    signalData,
    suggestedMessage,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  })

  return true
}

export async function POST(request: Request) {
  const cronError = requireCron(request)
  if (cronError) return cronError

  let signalsCreated = 0

  const weeklyRanks = await db.select().from(rankings).where(eq(rankings.period, 'weekly'))
  const monthlyRanks = await db.select().from(rankings).where(eq(rankings.period, 'monthly'))
  const monthlyByUser = new Map(monthlyRanks.map((rank) => [rank.userId, rank]))

  for (const weekly of weeklyRanks) {
    const monthly = monthlyByUser.get(weekly.userId)
    if (!monthly) continue

    const jump = monthly.rankPosition - weekly.rankPosition
    if (jump < 5) continue

    const watchers = await db
      .select()
      .from(competitorProfiles)
      .where(eq(competitorProfiles.subjectId, weekly.userId))

    for (const watcher of watchers) {
      const created = await insertSignal(watcher.watcherId, weekly.userId, 'ranking_jump', {
        weeklyRank: weekly.rankPosition,
        monthlyRank: monthly.rankPosition,
        jump,
        niche: weekly.niche,
      })
      if (created) signalsCreated += 1
    }
  }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const chronicles = await db
    .select()
    .from(tribesyncChronicles)
    .where(gte(tribesyncChronicles.generatedAt, monthStart))

  for (const chronicle of chronicles) {
    const watchers = await db
      .select()
      .from(competitorProfiles)
      .where(eq(competitorProfiles.subjectId, chronicle.userId))

    for (const watcher of watchers) {
      const created = await insertSignal(watcher.watcherId, chronicle.userId, 'creator_best_month', {
        month: chronicle.month,
        title: chronicle.title,
        metrics: chronicle.metrics,
        insights: chronicle.insights,
      })
      if (created) signalsCreated += 1
    }
  }

  const overdueFollowUps = await db
    .select()
    .from(crmContacts)
    .where(and(isNotNull(crmContacts.creatorId), isNotNull(crmContacts.followUpDueAt), lt(crmContacts.followUpDueAt, new Date())))

  for (const contact of overdueFollowUps) {
    if (!contact.creatorId) continue
    const created = await insertSignal(contact.ownerId, contact.creatorId, 'crm_followup_due', {
      contactName: contact.name,
      nextStep: contact.nextStep,
      followUpDueAt: contact.followUpDueAt?.toISOString(),
    })
    if (created) signalsCreated += 1
  }

  return NextResponse.json({ signalsCreated })
}
