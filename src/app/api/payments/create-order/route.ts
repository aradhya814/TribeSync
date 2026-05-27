import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { collabDeals, escrows } from '@/lib/db/schema'
import { getRazorpay } from '@/lib/razorpay'

const orderSchema = z.object({
  dealId: z.string().uuid(),
})

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  if (authResult.session.user.role !== 'msme') {
    return NextResponse.json({ error: 'Only brands can fund escrow' }, { status: 403 })
  }

  const parsed = orderSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payment payload' }, { status: 400 })
  }

  const [record] = await db
    .select({
      dealId: collabDeals.id,
      msmeId: collabDeals.msmeId,
      escrowId: escrows.id,
      escrowStatus: escrows.status,
      totalAmount: escrows.totalAmount,
    })
    .from(collabDeals)
    .innerJoin(escrows, eq(escrows.dealId, collabDeals.id))
    .where(and(eq(collabDeals.id, parsed.data.dealId), eq(collabDeals.msmeId, authResult.session.user.id)))
    .limit(1)

  if (!record) {
    return NextResponse.json({ error: 'Deal escrow not found' }, { status: 404 })
  }

  if (record.escrowStatus === 'funded' || record.escrowStatus === 'completed') {
    return NextResponse.json({ error: 'Escrow is already funded' }, { status: 409 })
  }

  const amountInPaise = Math.round(Number(record.totalAmount) * 100)
  if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
    return NextResponse.json({ error: 'Escrow amount is invalid' }, { status: 400 })
  }

  const razorpay = getRazorpay()
  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: `escrow_${record.escrowId.slice(0, 24)}`,
    notes: {
      dealId: record.dealId,
      escrowId: record.escrowId,
    },
  })

  await db
    .update(escrows)
    .set({
      paymentReference: order.id,
      paymentGateway: 'razorpay',
    })
    .where(eq(escrows.id, record.escrowId))

  return NextResponse.json({
    order_id: order.id,
    amount: amountInPaise,
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? '',
  })
}
