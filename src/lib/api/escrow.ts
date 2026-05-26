import { and, count, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { adminNotifications, escrows, milestones } from '@/lib/db/schema'
import { pusherServer } from '@/lib/pusher'

export async function releaseEscrowForMilestone(dealId: string, milestoneId: string) {
  const [totalResult] = await db.select({ total: count() }).from(milestones).where(eq(milestones.dealId, dealId))
  const [approvedResult] = await db
    .select({ total: count() })
    .from(milestones)
    .where(and(eq(milestones.dealId, dealId), eq(milestones.status, 'approved')))

  const totalMilestones = totalResult?.total ?? 0
  const approvedMilestones = approvedResult?.total ?? 0

  const [escrow] = await db.select().from(escrows).where(eq(escrows.dealId, dealId)).limit(1)
  if (!escrow || totalMilestones === 0) return null

  const totalAmount = Number(escrow.totalAmount)
  const proportionalRelease = Math.round((totalAmount / totalMilestones) * approvedMilestones * 100) / 100
  const status = approvedMilestones >= totalMilestones ? 'completed' : 'partial_release'

  const [updated] = await db
    .update(escrows)
    .set({
      releasedAmount: String(proportionalRelease),
      releasedAt: new Date(),
      status,
    })
    .where(eq(escrows.id, escrow.id))
    .returning()

  await db.insert(adminNotifications).values({
    type: 'payout_queue',
    title: 'Payout release queued',
    body: `Milestone ${milestoneId} approved for deal ${dealId}`,
    resourceType: 'deal',
    resourceId: dealId,
  })

  await pusherServer.trigger(`private-deal-${dealId}`, 'escrow-updated', { escrow: updated })

  return updated
}
