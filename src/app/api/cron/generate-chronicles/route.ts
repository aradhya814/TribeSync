import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireCron } from '@/lib/api/auth-check'
import { callClaude } from '@/lib/claude'
import { db } from '@/lib/db'
import { chronicleRunLog, collabDeals, milestones, profiles, tribesyncChronicles, type JsonRecord } from '@/lib/db/schema'

type ChronicleDraft = {
  title: string
  metrics: JsonRecord
  insights: string[]
}

const pageSize = 50

function currentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function parseDraft(raw: string, fallback: ChronicleDraft) {
  try {
    const parsed = JSON.parse(raw) as Partial<ChronicleDraft>
    return {
      title: parsed.title ?? fallback.title,
      metrics: parsed.metrics ?? fallback.metrics,
      insights: Array.isArray(parsed.insights) ? parsed.insights : fallback.insights,
    }
  } catch {
    return fallback
  }
}

export async function POST(request: Request) {
  const cronError = requireCron(request)
  if (cronError) return cronError

  const offset = Number(new URL(request.url).searchParams.get('offset') ?? 0)
  const month = currentMonth()
  const creators = await db.select().from(profiles).where(eq(profiles.status, 'active')).limit(pageSize).offset(offset)
  const allDeals = await db.select().from(collabDeals)
  const allMilestones = await db.select().from(milestones)
  let generated = 0

  for (const creator of creators) {
    const [existingLog] = await db
      .select()
      .from(chronicleRunLog)
      .where(and(eq(chronicleRunLog.creatorId, creator.id), eq(chronicleRunLog.month, month)))
      .limit(1)

    if (existingLog?.status === 'completed') continue

    const creatorDeals = allDeals.filter((deal) => deal.creatorId === creator.id)
    const creatorMilestones = allMilestones.filter((milestone) => creatorDeals.some((deal) => deal.id === milestone.dealId))
    const fallback: ChronicleDraft = {
      title: `${creator.fullName ?? creator.email}'s ${month} creator report`,
      metrics: {
        deals: creatorDeals.length,
        approvedMilestones: creatorMilestones.filter((milestone) => milestone.status === 'approved').length,
        avgViews: creator.avgViews ?? 0,
      },
      insights: ['Keep closing verified deals to improve ranking confidence.'],
    }

    let draft = fallback
    try {
      const response = await callClaude(
        `Return JSON { "title": string, "metrics": object, "insights": string[] }.
Creator: ${creator.fullName ?? creator.email}
Month: ${month}
Deals: ${JSON.stringify(creatorDeals)}
Milestones: ${JSON.stringify(creatorMilestones)}
Keep insights concrete and short.`,
        { model: 'haiku', maxTokens: 700 },
      )
      draft = parseDraft(response, fallback)
    } catch {
      draft = fallback
    }

    await db
      .insert(tribesyncChronicles)
      .values({
        userId: creator.id,
        month,
        title: draft.title,
        metrics: draft.metrics,
        insights: draft.insights,
      })
      .onConflictDoUpdate({
        target: [tribesyncChronicles.userId, tribesyncChronicles.month],
        set: {
          title: draft.title,
          metrics: draft.metrics,
          insights: draft.insights,
          generatedAt: new Date(),
          updatedAt: new Date(),
        },
      })

    await db
      .insert(chronicleRunLog)
      .values({ creatorId: creator.id, month, status: 'completed' })
      .onConflictDoUpdate({
        target: [chronicleRunLog.creatorId, chronicleRunLog.month],
        set: { status: 'completed', errorMessage: null, processedAt: new Date() },
      })

    generated += 1
  }

  return NextResponse.json({ generated, offset })
}
