import { eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { collabDeals, disputes, escrows } from '@/lib/db/schema'
import { pusherServer } from '@/lib/pusher'

type RouteContext = {
  params: { id: string }
}

const resolveSchema = z.object({
  winner: z.enum(['brand', 'creator', 'split']),
  resolution: z.string().min(5),
})

function releaseAmount(totalAmount: string, winner: 'brand' | 'creator' | 'split') {
  if (winner === 'brand') return '0'
  if (winner === 'creator') return totalAmount
  return String(Math.round((Number(totalAmount) / 2) * 100) / 100)
}

function escrowStatus(winner: 'brand' | 'creator' | 'split') {
  if (winner === 'brand') return 'refunded' as const
  if (winner === 'creator') return 'completed' as const
  return 'partial_release' as const
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authResult = await requireAdmin()
  if (authResult.error) return authResult.error

  const parsed = resolveSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid resolution payload' }, { status: 400 })

  const [record] = await db
    .select({
      dispute: disputes,
      deal: collabDeals,
      escrow: escrows,
    })
    .from(disputes)
    .innerJoin(collabDeals, eq(collabDeals.id, disputes.dealId))
    .innerJoin(escrows, eq(escrows.dealId, collabDeals.id))
    .where(eq(disputes.id, params.id))
    .limit(1)

  if (!record) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })

  const result = await db.transaction(async (transaction) => {
    await transaction.execute(sql`SET LOCAL app.current_user_role = 'admin'`)

    const [updatedDispute] = await transaction
      .update(disputes)
      .set({
        status: 'resolved',
        resolution: `${parsed.data.winner}: ${parsed.data.resolution}`,
        resolvedBy: authResult.session.user.id,
        resolvedAt: new Date(),
      })
      .where(eq(disputes.id, record.dispute.id))
      .returning()

    const [updatedEscrow] = await transaction
      .update(escrows)
      .set({
        status: escrowStatus(parsed.data.winner),
        releasedAmount: releaseAmount(record.escrow.totalAmount, parsed.data.winner),
        releasedAt: new Date(),
      })
      .where(eq(escrows.id, record.escrow.id))
      .returning()

    const [updatedDeal] = await transaction
      .update(collabDeals)
      .set({ status: 'completed' })
      .where(eq(collabDeals.id, record.deal.id))
      .returning()

    return { dispute: updatedDispute, escrow: updatedEscrow, deal: updatedDeal }
  })

  await pusherServer.trigger(`private-deal-${record.deal.id}`, 'deal-updated', result)
  if (record.deal.creatorId) {
    await pusherServer.trigger(`private-user-${record.deal.creatorId}`, 'deal-updated', result)
  }
  if (record.deal.msmeId) {
    await pusherServer.trigger(`private-user-${record.deal.msmeId}`, 'deal-updated', result)
  }

  return NextResponse.json(result)
}
