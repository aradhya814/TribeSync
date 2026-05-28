import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { parseJsonBody } from '@/lib/api/json'
import { db } from '@/lib/db'
import { collabDeals, milestones } from '@/lib/db/schema'
import { pusherServer } from '@/lib/pusher'

const milestoneSchema = z.object({
  dealId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  dueDate: z.string().optional(),
})

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const body = await parseJsonBody(request)
  if (body.error) return NextResponse.json({ error: body.error }, { status: 400 })

  const parsed = milestoneSchema.safeParse(body.data)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid milestone payload' }, { status: 400 })

  const [deal] = await db.select().from(collabDeals).where(eq(collabDeals.id, parsed.data.dealId)).limit(1)
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  if (authResult.session.user.role !== 'admin' && deal.msmeId !== authResult.session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (deal.status !== 'initiated') {
    return NextResponse.json({ error: 'Milestones can only be added before the deal activates' }, { status: 409 })
  }

  const [milestone] = await db
    .insert(milestones)
    .values({
      dealId: deal.id,
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate,
      status: 'pending',
    })
    .returning()

  await pusherServer.trigger(`private-deal-${deal.id}`, 'milestone-updated', { milestone })

  return NextResponse.json({ milestone }, { status: 201 })
}
