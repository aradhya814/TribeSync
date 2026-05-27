import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { callClaude } from '@/lib/claude'
import { db } from '@/lib/db'
import { campaigns, outreachLogs, profiles } from '@/lib/db/schema'

type OutreachDraft = {
  subject: string
  message: string
}

const outreachSchema = z.object({
  creatorId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  recipientEmail: z.string().email().optional(),
  creator: z.unknown().optional(),
  campaign: z.unknown().optional(),
  tone: z.string().default('warm and concise'),
})

function parseDraft(raw: string, fallback: OutreachDraft) {
  try {
    const parsed = JSON.parse(raw) as Partial<OutreachDraft>
    return {
      subject: parsed.subject?.slice(0, 120) ?? fallback.subject,
      message: parsed.message ?? fallback.message,
    }
  } catch {
    return fallback
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const parsed = outreachSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid outreach payload' }, { status: 400 })

  const [sender] = await db.select().from(profiles).where(eq(profiles.id, authResult.session.user.id)).limit(1)
  const [creator] = parsed.data.creatorId
    ? await db.select().from(profiles).where(eq(profiles.id, parsed.data.creatorId)).limit(1)
    : []
  const [campaign] = parsed.data.campaignId
    ? await db.select().from(campaigns).where(eq(campaigns.id, parsed.data.campaignId)).limit(1)
    : []

  const recipientEmail = creator?.email ?? parsed.data.recipientEmail
  if (!recipientEmail) return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })

  const fallback: OutreachDraft = {
    subject: campaign ? `${campaign.title} collaboration` : 'Collaboration opportunity',
    message: `Hi ${creator?.fullName ?? 'there'}, I am ${sender?.fullName ?? 'from TribeSync'} and would like to discuss a collaboration. Are you open to a quick conversation?`,
  }

  let draft = fallback
  try {
    const response = await callClaude(
      `Return JSON { "subject": string, "message": string } for an influencer outreach email.
Tone: ${parsed.data.tone}
Sender: ${JSON.stringify(sender ?? parsed.data.creator)}
Creator: ${JSON.stringify(creator ?? parsed.data.creator)}
Campaign: ${JSON.stringify(campaign ?? parsed.data.campaign)}
Rules: under 130 words, direct CTA, no hype.`,
      { model: 'haiku', maxTokens: 500 },
    )
    draft = parseDraft(response, fallback)
  } catch {
    draft = fallback
  }

  await db.insert(outreachLogs).values({
    senderId: authResult.session.user.id,
    recipientId: creator?.id,
    recipientEmail,
    campaignId: campaign?.id,
    subject: draft.subject,
    message: draft.message,
    status: 'sent',
    followUpDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  })

  return NextResponse.json(draft)
}
