import { eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { campaigns, collabDeals, escrows, invoices, milestones, profiles } from '@/lib/db/schema'

type RouteContext = {
  params: { id: string }
}

const creatorProfile = alias(profiles, 'deal_creator_profile')
const brandProfile = alias(profiles, 'deal_brand_profile')

export async function GET(_request: Request, { params }: RouteContext) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const [record] = await db
    .select({
      deal: collabDeals,
      campaign: campaigns,
      escrow: escrows,
      invoice: invoices,
      creator: {
        id: creatorProfile.id,
        fullName: creatorProfile.fullName,
        email: creatorProfile.email,
        avatarUrl: creatorProfile.avatarUrl,
      },
      brand: {
        id: brandProfile.id,
        fullName: brandProfile.fullName,
        email: brandProfile.email,
        avatarUrl: brandProfile.avatarUrl,
      },
    })
    .from(collabDeals)
    .innerJoin(campaigns, eq(campaigns.id, collabDeals.campaignId))
    .leftJoin(escrows, eq(escrows.dealId, collabDeals.id))
    .leftJoin(invoices, eq(invoices.dealId, collabDeals.id))
    .leftJoin(creatorProfile, eq(creatorProfile.id, collabDeals.creatorId))
    .leftJoin(brandProfile, eq(brandProfile.id, collabDeals.msmeId))
    .where(eq(collabDeals.id, params.id))
    .limit(1)

  if (!record) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const isParticipant =
    record.deal.creatorId === authResult.session.user.id || record.deal.msmeId === authResult.session.user.id
  if (authResult.session.user.role !== 'admin' && !isParticipant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const dealMilestones = await db
    .select()
    .from(milestones)
    .where(eq(milestones.dealId, record.deal.id))
    .orderBy(milestones.dueDate)

  return NextResponse.json({
    ...record,
    milestones: dealMilestones,
    viewer: {
      id: authResult.session.user.id,
      role: authResult.session.user.role,
    },
  })
}
