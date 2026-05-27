import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { campaigns, collabDeals, escrows } from '@/lib/db/schema'

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const userId = authResult.session.user.id
  const brandCampaigns = await db.select().from(campaigns).where(eq(campaigns.createdBy, userId))
  const deals = await db.select().from(collabDeals).where(eq(collabDeals.msmeId, userId))
  const allEscrows = await db
    .select({ escrow: escrows, deal: collabDeals })
    .from(escrows)
    .innerJoin(collabDeals, eq(collabDeals.id, escrows.dealId))
    .where(eq(collabDeals.msmeId, userId))

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
