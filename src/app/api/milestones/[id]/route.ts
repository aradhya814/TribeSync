import { and, count, eq, ne } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { onInvoiceCreated } from '@/lib/agent/invoice-agent'
import { requireAuth } from '@/lib/api/auth-check'
import { releaseEscrowForMilestone } from '@/lib/api/escrow'
import { parseJsonBody } from '@/lib/api/json'
import { verifyProof } from '@/lib/api/proof'
import { db } from '@/lib/db'
import { collabDeals, invoices, milestones, profiles } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email'
import { pusherServer } from '@/lib/pusher'

type RouteContext = {
  params: { id: string }
}

const creatorProfile = alias(profiles, 'milestone_creator_profile')
const brandProfile = alias(profiles, 'milestone_brand_profile')

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('submit_proof'),
    proofUrl: z.string().url(),
  }),
  z.object({
    action: z.literal('approve'),
  }),
  z.object({
    action: z.literal('reject'),
    rejectionReason: z.string().min(3),
  }),
])

async function fetchMilestoneContext(milestoneId: string) {
  const [record] = await db
    .select({
      milestone: milestones,
      deal: collabDeals,
      creatorEmail: creatorProfile.email,
      creatorName: creatorProfile.fullName,
      brandEmail: brandProfile.email,
      brandName: brandProfile.fullName,
    })
    .from(milestones)
    .innerJoin(collabDeals, eq(collabDeals.id, milestones.dealId))
    .leftJoin(creatorProfile, eq(creatorProfile.id, collabDeals.creatorId))
    .leftJoin(brandProfile, eq(brandProfile.id, collabDeals.msmeId))
    .where(eq(milestones.id, milestoneId))
    .limit(1)

  return record
}

function invoiceNumber() {
  const year = new Date().getFullYear()
  const suffix = String(Date.now()).slice(-6)
  return `TS-${year}-${suffix}`
}

async function ensureInvoice(deal: typeof collabDeals.$inferSelect) {
  const [existing] = await db.select().from(invoices).where(eq(invoices.dealId, deal.id)).limit(1)
  if (existing) return existing

  const amount = deal.agreedAmount
  const platformFee = String(Math.round(Number(amount) * 0.1 * 100) / 100)
  const creatorPayout = String(Math.round(Number(amount) * 0.9 * 100) / 100)

  const [invoice] = await db
    .insert(invoices)
    .values({
      dealId: deal.id,
      invoiceNumber: invoiceNumber(),
      creatorId: deal.creatorId,
      msmeId: deal.msmeId,
      amount,
      platformFee,
      creatorPayout,
      status: 'draft',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    })
    .returning()

  return invoice
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const body = await parseJsonBody(request)
  if (body.error) return NextResponse.json({ error: body.error }, { status: 400 })

  const parsed = patchSchema.safeParse(body.data)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid milestone payload' }, { status: 400 })

  const context = await fetchMilestoneContext(params.id)
  if (!context) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })

  const { milestone, deal } = context

  if (parsed.data.action === 'submit_proof') {
    if (deal.creatorId !== authResult.session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [updated] = await db
      .update(milestones)
      .set({
        proofUrl: parsed.data.proofUrl,
        proofSubmittedAt: new Date(),
        status: 'completed',
      })
      .where(eq(milestones.id, milestone.id))
      .returning()

    void verifyProof(milestone.id, parsed.data.proofUrl, milestone.proofUrl).catch((error) => {
      console.error('Proof verification failed', error)
    })

    await pusherServer.trigger(`private-deal-${deal.id}`, 'milestone-updated', { milestone: updated })
    if (deal.msmeId) {
      await pusherServer.trigger(`private-user-${deal.msmeId}`, 'milestone-updated', { milestone: updated })
    }

    return NextResponse.json({ milestone: updated })
  }

  if (authResult.session.user.role !== 'admin' && deal.msmeId !== authResult.session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (parsed.data.action === 'reject') {
    const [updated] = await db
      .update(milestones)
      .set({
        status: 'rejected',
        rejectionReason: parsed.data.rejectionReason,
      })
      .where(eq(milestones.id, milestone.id))
      .returning()

    if (context.creatorEmail) {
      await sendEmail({
        to: context.creatorEmail,
        template: 'milestone_rejected',
        data: {
          creatorName: context.creatorName,
          milestone: milestone.title,
          reason: parsed.data.rejectionReason,
        },
      })
    }

    await pusherServer.trigger(`private-deal-${deal.id}`, 'milestone-updated', { milestone: updated })
    if (deal.creatorId) {
      await pusherServer.trigger(`private-user-${deal.creatorId}`, 'milestone-updated', { milestone: updated })
    }

    return NextResponse.json({ milestone: updated })
  }

  if (deal.status !== 'active') {
    return NextResponse.json({ error: 'Milestones can only be approved after escrow is funded' }, { status: 409 })
  }

  const [updated] = await db
    .update(milestones)
    .set({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: authResult.session.user.id,
    })
    .where(eq(milestones.id, milestone.id))
    .returning()

  const escrow = await releaseEscrowForMilestone(deal.id, milestone.id)

  if (context.creatorEmail) {
    await sendEmail({
      to: context.creatorEmail,
      template: 'milestone_approved',
      data: {
        creatorName: context.creatorName,
        milestone: milestone.title,
        releasedAmount: escrow?.releasedAmount ? `Rs ${Number(escrow.releasedAmount).toLocaleString('en-IN')}` : undefined,
      },
    })
  }

  await pusherServer.trigger(`private-deal-${deal.id}`, 'milestone-updated', { milestone: updated, escrow })
  if (deal.creatorId) {
    await pusherServer.trigger(`private-user-${deal.creatorId}`, 'milestone-updated', { milestone: updated, escrow })
  }

  const [remaining] = await db
    .select({ total: count() })
    .from(milestones)
    .where(and(eq(milestones.dealId, deal.id), ne(milestones.status, 'approved')))

  let invoiceId: string | null = null

  if ((remaining?.total ?? 0) === 0) {
    const [completedDeal] = await db
      .update(collabDeals)
      .set({ status: 'completed' })
      .where(eq(collabDeals.id, deal.id))
      .returning()

    const finalDeal = completedDeal ?? deal
    const invoice = await ensureInvoice(finalDeal)
    invoiceId = invoice.id

    try {
      await onInvoiceCreated(invoice.id)
    } catch (error) {
      console.error('Invoice agent failed', error)
    }

    await pusherServer.trigger(`private-deal-${deal.id}`, 'deal-completed', {
      deal: finalDeal,
      invoiceId,
    })

    if (deal.creatorId) {
      await pusherServer.trigger(`private-user-${deal.creatorId}`, 'deal-updated', {
        deal: finalDeal,
        invoiceId,
      })
    }

    if (deal.msmeId) {
      await pusherServer.trigger(`private-user-${deal.msmeId}`, 'deal-updated', {
        deal: finalDeal,
        invoiceId,
      })
    }

    if (context.creatorEmail) {
      await sendEmail({
        to: context.creatorEmail,
        template: 'deal_completed',
        data: { dealId: deal.id, invoiceId },
      })
    }

    if (context.brandEmail) {
      await sendEmail({
        to: context.brandEmail,
        template: 'deal_completed',
        data: { dealId: deal.id, invoiceId },
      })
    }
  }

  return NextResponse.json({ milestone: updated, escrow, invoiceId })
}
