import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { campaigns, collabDeals, escrows } from '@/lib/db/schema'

export async function GET() {
  const authResult = await requireAdmin()
  if (authResult.error) return authResult.error

  const [allCampaigns, deals, allEscrows] = await Promise.all([
    db.select().from(campaigns),
    db.select().from(collabDeals),
    db.select().from(escrows),
  ])

  return NextResponse.json({
    funnel: [
      { stage: 'Campaigns', count: allCampaigns.length },
      { stage: 'Deals', count: deals.length },
      { stage: 'Escrow funded', count: allEscrows.filter((escrow) => escrow.status !== 'unfunded').length },
      {
        stage: 'Completed',
        count: deals.filter((deal) => deal.status === 'completed' || deal.status === 'invoiced' || deal.status === 'paid').length,
      },
      { stage: 'Paid', count: deals.filter((deal) => deal.status === 'paid').length },
    ],
  })
}
