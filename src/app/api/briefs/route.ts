import { and, count, eq, gte } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { sendEmail } from '@/lib/email'
import { pusherServer } from '@/lib/pusher'
import { db } from '@/lib/db'
import { inboundBriefs, profiles } from '@/lib/db/schema'

const briefSchema = z.object({
  creatorId: z.string().uuid(),
  brandName: z.string().min(2),
  contactEmail: z.string().email(),
  product: z.string().min(2),
  budget: z.string().nullable().optional(),
  timeline: z.string().optional(),
  message: z.string().optional(),
})

function requestIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = briefSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid brief payload' }, { status: 400 })
  }

  const ipAddress = requestIp(request)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [rateLimit] = await db
    .select({ total: count() })
    .from(inboundBriefs)
    .where(
      and(
        eq(inboundBriefs.creatorId, parsed.data.creatorId),
        eq(inboundBriefs.ipAddress, ipAddress),
        gte(inboundBriefs.submittedAt, since),
      ),
    )

  if ((rateLimit?.total ?? 0) >= 3) {
    return NextResponse.json({ error: 'Too many briefs sent to this creator today' }, { status: 429 })
  }

  const [creator] = await db
    .select({ id: profiles.id, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, parsed.data.creatorId))
    .limit(1)

  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  }

  const [brief] = await db
    .insert(inboundBriefs)
    .values({
      creatorId: parsed.data.creatorId,
      brandName: parsed.data.brandName,
      contactEmail: parsed.data.contactEmail,
      product: parsed.data.product,
      budget: parsed.data.budget ? parsed.data.budget : null,
      timeline: parsed.data.timeline,
      message: parsed.data.message,
      ipAddress,
    })
    .returning()

  await sendEmail({
    to: creator.email,
    template: 'outreach_received',
    data: {
      brandName: brief.brandName,
      product: brief.product,
      budget: brief.budget,
      contactEmail: brief.contactEmail,
    },
  })

  await pusherServer.trigger(`private-user-${creator.id}`, 'brief-received', { brief })

  return NextResponse.json({ success: true })
}
