import { and, desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { parseJsonBody } from '@/lib/api/json'
import { db } from '@/lib/db'
import { campaignApplications, campaigns, profiles } from '@/lib/db/schema'

const campaignSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  goal: z.string().optional(),
  niche: z.string().optional(),
  budget: z.string().optional(),
  timelineStart: z.string().optional(),
  timelineEnd: z.string().optional(),
  priority: z.string().optional(),
  campaignType: z.string().optional(),
  targetCreatorId: z.string().uuid().optional(),
  minAvgViews: z.number().int().nonnegative().optional(),
  minSubscribers: z.number().int().nonnegative().optional(),
  requiredPlatforms: z.array(z.string()).optional(),
  requiredContentStyle: z.string().optional(),
  deliverables: z.string().optional(),
  maxApplicants: z.number().int().positive().optional(),
  applicationDeadline: z.string().optional(),
})

export async function GET() {
  const authResult = await requireAuth()

  if (authResult.error) return authResult.error

  const { session } = authResult

  if (session.user.role === 'creator') {
    const [profile] = await db
      .select({ niche: profiles.niche, id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, session.user.id))
      .limit(1)

    const applications = db
      .select({ campaignId: campaignApplications.campaignId })
      .from(campaignApplications)
      .where(eq(campaignApplications.creatorId, session.user.id))

    const rows = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.status, 'live'), profile?.niche ? eq(campaigns.niche, profile.niche) : undefined))
      .orderBy(desc(campaigns.budget))

    const appliedIds = new Set((await applications).map((item) => item.campaignId))
    return NextResponse.json({ campaigns: rows.filter((campaign) => !appliedIds.has(campaign.id)) })
  }

  if (session.user.role === 'admin') {
    const rows = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt))
    return NextResponse.json({ campaigns: rows })
  }

  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.createdBy, session.user.id))
    .orderBy(desc(campaigns.createdAt))

  return NextResponse.json({ campaigns: rows })
}

export async function POST(request: Request) {
  const authResult = await requireAuth()

  if (authResult.error) return authResult.error

  const body = await parseJsonBody(request)
  if (body.error) return NextResponse.json({ error: body.error }, { status: 400 })

  const parsed = campaignSchema.safeParse(body.data)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid campaign payload' }, { status: 400 })
  }

  const [campaign] = await db
    .insert(campaigns)
    .values({
      ...parsed.data,
      createdBy: authResult.session.user.id,
      budget: parsed.data.budget ?? '0',
      status: 'draft',
    })
    .returning()

  return NextResponse.json({ campaign }, { status: 201 })
}
