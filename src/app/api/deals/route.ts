import { eq, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { campaigns, collabDeals, profiles } from '@/lib/db/schema'

const creatorProfile = alias(profiles, 'deal_creator_profile')
const brandProfile = alias(profiles, 'deal_brand_profile')

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const userId = authResult.session.user.id

  const deals = await db
    .select({
      id: collabDeals.id,
      status: collabDeals.status,
      agreedAmount: collabDeals.agreedAmount,
      createdAt: collabDeals.createdAt,
      campaign: { title: campaigns.title },
      creator: { fullName: creatorProfile.fullName, email: creatorProfile.email },
      msme: { fullName: brandProfile.fullName, email: brandProfile.email },
    })
    .from(collabDeals)
    .leftJoin(campaigns, eq(collabDeals.campaignId, campaigns.id))
    .leftJoin(creatorProfile, eq(collabDeals.creatorId, creatorProfile.id))
    .leftJoin(brandProfile, eq(collabDeals.msmeId, brandProfile.id))
    .where(or(eq(collabDeals.creatorId, userId), eq(collabDeals.msmeId, userId)))
    .orderBy(collabDeals.createdAt)

  return NextResponse.json(deals)
}
