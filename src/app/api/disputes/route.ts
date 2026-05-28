import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { parseJsonBody } from '@/lib/api/json'
import { db } from '@/lib/db'
import { adminNotifications, collabDeals, disputes, escrows } from '@/lib/db/schema'
import { pusherServer } from '@/lib/pusher'

const disputeSchema = z.object({
  dealId: z.string().uuid(),
  disputeType: z.enum(['payment', 'deliverable', 'timeline', 'other']),
  description: z.string().min(10),
})

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const body = await parseJsonBody(request)
  if (body.error) return NextResponse.json({ error: body.error }, { status: 400 })

  const parsed = disputeSchema.safeParse(body.data)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid dispute payload' }, { status: 400 })

  const [deal] = await db.select().from(collabDeals).where(eq(collabDeals.id, parsed.data.dealId)).limit(1)
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const isParticipant = deal.creatorId === authResult.session.user.id || deal.msmeId === authResult.session.user.id
  if (authResult.session.user.role !== 'admin' && !isParticipant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (deal.status !== 'active') {
    return NextResponse.json({ error: 'Only active deals can be disputed' }, { status: 409 })
  }

  const [dispute] = await db.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(disputes)
      .values({
        dealId: deal.id,
        raisedBy: authResult.session.user.id,
        disputeType: parsed.data.disputeType,
        description: parsed.data.description,
        status: 'open',
      })
      .returning()

    await transaction.update(collabDeals).set({ status: 'disputed' }).where(eq(collabDeals.id, deal.id))
    await transaction.update(escrows).set({ status: 'disputed' }).where(eq(escrows.dealId, deal.id))
    await transaction.insert(adminNotifications).values({
      type: 'dispute_opened',
      title: 'New deal dispute',
      body: `Deal ${deal.id} was disputed: ${parsed.data.description}`,
      resourceType: 'deal',
      resourceId: deal.id,
    })

    return [created]
  })

  await pusherServer.trigger(`private-deal-${deal.id}`, 'deal-updated', { dispute, status: 'disputed' })
  if (deal.creatorId) {
    await pusherServer.trigger(`private-user-${deal.creatorId}`, 'deal-updated', { dispute, status: 'disputed' })
  }
  if (deal.msmeId) {
    await pusherServer.trigger(`private-user-${deal.msmeId}`, 'deal-updated', { dispute, status: 'disputed' })
  }

  return NextResponse.json({ dispute }, { status: 201 })
}
