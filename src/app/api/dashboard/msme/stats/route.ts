import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { campaigns, collabDeals, escrows } from '@/lib/db/schema'

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const userId = authResult.session.user.id
  let brandCampaigns = await db.select().from(campaigns).where(eq(campaigns.createdBy, userId))
  let deals = await db.select().from(collabDeals).where(eq(collabDeals.msmeId, userId))
  let allEscrows = await db
    .select({ escrow: escrows, deal: collabDeals })
    .from(escrows)
    .innerJoin(collabDeals, eq(collabDeals.id, escrows.dealId))
    .where(eq(collabDeals.msmeId, userId))

  if (brandCampaigns.length === 0 && deals.length === 0) {
    ;[brandCampaigns, deals, allEscrows] = await Promise.all([
      db.select().from(campaigns).limit(10),
      db.select().from(collabDeals).limit(10),
      db.select({ escrow: escrows, deal: collabDeals }).from(escrows).innerJoin(collabDeals, eq(collabDeals.id, escrows.dealId)).limit(10),
    ])
  }

  const totalSpent = deals.reduce((sum, deal) => sum + Number(deal.agreedAmount), 0)
  const escrowActive = allEscrows
    .filter((item) => item.escrow.status === 'funded' || item.escrow.status === 'partial_release')
    .reduce((sum, item) => sum + Number(item.escrow.totalAmount), 0)
  const completedDeals = deals.filter((deal) => deal.status === 'completed' || deal.status === 'invoiced' || deal.status === 'paid').length
  const avgDealRoi = deals.length > 0 ? Math.round((completedDeals / deals.length) * 100) : 0

  return NextResponse.json({
    totalSpent,
    campaignsRun: brandCampaigns.length,
    avgDealRoi,
    escrowActive,
  })
}
