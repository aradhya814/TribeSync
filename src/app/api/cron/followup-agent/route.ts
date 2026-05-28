import { and, eq, isNull, lt } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { NextResponse } from 'next/server'

import { requireCron } from '@/lib/api/auth-check'
import { callClaude } from '@/lib/claude'
import { db } from '@/lib/db'
import { outreachLogs, profiles } from '@/lib/db/schema'
import { sendGmail } from '@/lib/gmail'

type FollowUpDraft = {
  subject: string
  message: string
}

const senderProfile = alias(profiles, 'followup_sender_profile')
const recipientProfile = alias(profiles, 'followup_recipient_profile')

function parseDraft(raw: string, fallback: FollowUpDraft) {
  try {
    const parsed = JSON.parse(raw) as Partial<FollowUpDraft>
    return {
      subject: parsed.subject ?? fallback.subject,
      message: parsed.message ?? fallback.message,
    }
  } catch {
    return fallback
  }
}

export async function POST(request: Request) {
  const cronError = requireCron(request)
  if (cronError) return cronError

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const pending = await db
    .select({
      outreach: outreachLogs,
      sender: senderProfile,
      recipient: recipientProfile,
    })
    .from(outreachLogs)
    .leftJoin(senderProfile, eq(senderProfile.id, outreachLogs.senderId))
    .leftJoin(recipientProfile, eq(recipientProfile.id, outreachLogs.recipientId))
    .where(and(eq(outreachLogs.status, 'sent'), isNull(outreachLogs.respondedAt), lt(outreachLogs.sentAt, cutoff)))

  let followUpsSent = 0

  for (const item of pending) {
    const to = item.recipient?.email ?? item.outreach.recipientEmail
    if (!to) continue

    const fallback: FollowUpDraft = {
      subject: `Following up: ${item.outreach.subject ?? 'collaboration'}`,
      message: `Hi ${item.recipient?.fullName ?? 'there'}, just following up on my earlier note. Open to discussing this collaboration?`,
    }

    let draft = fallback
    try {
      const response = await callClaude(
        `Return JSON { "subject": string, "message": string } for a polite follow-up.
Original subject: ${item.outreach.subject ?? ''}
Original message: ${item.outreach.message}
Sender: ${item.sender?.fullName ?? 'Brand'}
Recipient: ${item.recipient?.fullName ?? 'Creator'}
Rules: under 80 words, no guilt, one CTA.`,
        { model: 'haiku', maxTokens: 300 },
      )
      draft = parseDraft(response, fallback)
    } catch {
      draft = fallback
    }

    await sendGmail(to, draft.subject, draft.message)

    await db.insert(outreachLogs).values({
      senderId: item.outreach.senderId,
      recipientId: item.outreach.recipientId,
      recipientEmail: to,
      campaignId: item.outreach.campaignId,
      subject: draft.subject,
      message: draft.message,
      status: 'sent',
      followUpDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    })

    followUpsSent += 1
  }

  return NextResponse.json({ followUpsSent })
}
