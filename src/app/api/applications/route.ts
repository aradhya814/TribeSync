import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { parseJsonBody } from '@/lib/api/json'
import { db } from '@/lib/db'
import { campaignApplications, campaigns } from '@/lib/db/schema'

const applicationSchema = z.object({
  campaignId: z.string().uuid(),
  pitch: z.string().optional(),
  proposedRate: z.string().optional(),
})

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  if (authResult.session.user.role === 'creator') {
    const applications = await db
      .select()
      .from(campaignApplications)
      .where(eq(campaignApplications.creatorId, authResult.session.user.id))
      .orderBy(desc(campaignApplications.appliedAt))
    return NextResponse.json({ applications })
  }

  const applications = await db
    .select()
    .from(campaignApplications)
    .innerJoin(campaigns, eq(campaigns.id, campaignApplications.campaignId))
    .where(eq(campaigns.createdBy, authResult.session.user.id))
    .orderBy(desc(campaignApplications.appliedAt))

  return NextResponse.json({ applications })
}

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error
  if (authResult.session.user.role !== 'creator') {
    return NextResponse.json({ error: 'Only creators can apply' }, { status: 403 })
  }

  const body = await parseJsonBody(request)
  if (body.error) return NextResponse.json({ error: body.error }, { status: 400 })

  const parsed = applicationSchema.safeParse(body.data)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid application payload' }, { status: 400 })

  const [application] = await db
    .insert(campaignApplications)
    .values({
      campaignId: parsed.data.campaignId,
      creatorId: authResult.session.user.id,
      pitch: parsed.data.pitch,
      proposedRate: parsed.data.proposedRate,
    })
    .onConflictDoNothing()
    .returning()

  return NextResponse.json({ application })
}
