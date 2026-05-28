import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { createDeal } from '@/lib/api/deals'
import { parseJsonBody } from '@/lib/api/json'
import { db } from '@/lib/db'
import { campaignApplications, campaigns } from '@/lib/db/schema'

type RouteContext = {
  params: { id: string }
}

const patchSchema = z.object({
  status: z.string(),
})

export async function PATCH(request: Request, { params }: RouteContext) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const body = await parseJsonBody(request)
  if (body.error) return NextResponse.json({ error: body.error }, { status: 400 })

  const parsed = patchSchema.safeParse(body.data)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid application payload' }, { status: 400 })

  const [application] = await db
    .select({
      id: campaignApplications.id,
      campaignId: campaignApplications.campaignId,
      creatorId: campaignApplications.creatorId,
      proposedRate: campaignApplications.proposedRate,
      campaignOwnerId: campaigns.createdBy,
      budget: campaigns.budget,
    })
    .from(campaignApplications)
    .innerJoin(campaigns, eq(campaigns.id, campaignApplications.campaignId))
    .where(eq(campaignApplications.id, params.id))
    .limit(1)

  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  if (authResult.session.user.role !== 'admin' && application.campaignOwnerId !== authResult.session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [updated] = await db
    .update(campaignApplications)
    .set({ status: parsed.data.status, reviewedAt: new Date(), reviewedBy: authResult.session.user.id })
    .where(eq(campaignApplications.id, params.id))
    .returning()

  if (parsed.data.status === 'accepted') {
    const deal = await createDeal({
      campaignId: application.campaignId,
      creatorId: application.creatorId,
      msmeId: application.campaignOwnerId,
      agreedAmount: application.proposedRate ?? application.budget ?? '0',
    })
    return NextResponse.json({ application: updated, deal })
  }

  return NextResponse.json({ application: updated })
}
