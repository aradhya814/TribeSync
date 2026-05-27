import crypto from 'crypto'

import { eq, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { adminNotifications, collabDeals, escrows, profiles } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email'
import { pusherServer } from '@/lib/pusher'

type RecordValue = Record<string, unknown>

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RecordValue) : null
}

function getNestedRecord(value: unknown, keys: string[]) {
  return keys.reduce<RecordValue | null>((current, key) => {
    if (!current) return null
    return asRecord(current[key])
  }, asRecord(value))
}

function readString(record: RecordValue | null, key: string) {
  const value = record?.[key]
  return typeof value === 'string' ? value : null
}

function readNumber(record: RecordValue | null, key: string) {
  const value = record?.[key]
  return typeof value === 'number' ? value : null
}

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !signature) return false

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)

  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature')

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid Razorpay signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody) as unknown
  const payment = getNestedRecord(payload, ['payload', 'payment', 'entity'])
  const order = getNestedRecord(payload, ['payload', 'order', 'entity'])
  const paymentId = readString(payment, 'id') ?? readString(order, 'id')
  const orderId = readString(payment, 'order_id') ?? readString(order, 'id')
  const amountInPaise = readNumber(payment, 'amount') ?? readNumber(order, 'amount_paid') ?? readNumber(order, 'amount')

  if (!orderId || !paymentId || amountInPaise === null) {
    return NextResponse.json({ received: true, ignored: 'No payment/order entity' })
  }

  const [record] = await db
    .select({
      escrow: escrows,
      deal: collabDeals,
      creatorEmail: profiles.email,
      creatorName: profiles.fullName,
    })
    .from(escrows)
    .innerJoin(collabDeals, eq(collabDeals.id, escrows.dealId))
    .leftJoin(profiles, eq(profiles.id, collabDeals.creatorId))
    .where(or(eq(escrows.paymentReference, orderId), eq(escrows.paymentReference, paymentId)))
    .limit(1)

  if (!record) {
    await db.insert(adminNotifications).values({
      type: 'payment_webhook_unmatched',
      title: 'Unmatched Razorpay payment',
      body: `Payment ${paymentId} for order ${orderId} did not match an escrow.`,
      resourceType: 'payment',
    })
    return NextResponse.json({ received: true, unmatched: true })
  }

  if (record.escrow.status === 'funded' || record.escrow.status === 'completed') {
    return NextResponse.json({ received: true, idempotent: true })
  }

  const expectedAmount = Number(record.escrow.totalAmount)
  const paidAmount = amountInPaise / 100
  if (Math.abs(expectedAmount - paidAmount) > 1) {
    await db.insert(adminNotifications).values({
      type: 'payment_amount_mismatch',
      title: 'Razorpay amount mismatch',
      body: `Deal ${record.deal.id} expected Rs ${expectedAmount.toLocaleString('en-IN')} but Razorpay reported Rs ${paidAmount.toLocaleString('en-IN')}.`,
      resourceType: 'deal',
      resourceId: record.deal.id,
    })
    return NextResponse.json({ received: true, mismatch: true }, { status: 202 })
  }

  const [updatedEscrow] = await db
    .update(escrows)
    .set({
      status: 'funded',
      fundedAt: new Date(),
      paymentReference: paymentId,
      paymentGateway: 'razorpay',
    })
    .where(eq(escrows.id, record.escrow.id))
    .returning()

  const [updatedDeal] = await db
    .update(collabDeals)
    .set({ status: 'active' })
    .where(eq(collabDeals.id, record.deal.id))
    .returning()

  if (record.deal.creatorId) {
    await pusherServer.trigger(`private-user-${record.deal.creatorId}`, 'deal-updated', {
      deal: updatedDeal,
      escrow: updatedEscrow,
    })
  }

  await pusherServer.trigger(`private-deal-${record.deal.id}`, 'deal-updated', {
    deal: updatedDeal,
    escrow: updatedEscrow,
  })

  if (record.creatorEmail) {
    await sendEmail({
      to: record.creatorEmail,
      template: 'escrow_funded',
      data: {
        creatorName: record.creatorName,
        amount: `Rs ${expectedAmount.toLocaleString('en-IN')}`,
        dealId: record.deal.id,
      },
    })
  }

  return NextResponse.json({ received: true, funded: true })
}
