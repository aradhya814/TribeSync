import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { outreachLogs, outreachSignals, profiles } from '@/lib/db/schema'
import { sendGmail } from '@/lib/gmail'

type RouteContext = {
  params: { id: string }
}

export async function POST(_request: Request, { params }: RouteContext) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const [record] = await db
    .select({
      signal: outreachSignals,
      creator: profiles,
    })
    .from(outreachSignals)
    .innerJoin(profiles, eq(profiles.id, outreachSignals.creatorId))
    .where(and(eq(outreachSignals.id, params.id), eq(outreachSignals.forUserId, authResult.session.user.id)))
    .limit(1)

  if (!record) return NextResponse.json({ error: 'Signal not found' }, { status: 404 })

  const subject = `TribeSync collaboration: ${record.signal.signalType.replaceAll('_', ' ')}`
  const message =
    record.signal.suggestedMessage ??
    `Hi ${record.creator.fullName ?? 'there'}, I saw a useful signal for your work and wanted to discuss a collaboration.`

  const provider = await sendGmail(record.creator.email, subject, message)

  await db.insert(outreachLogs).values({
    senderId: authResult.session.user.id,
    recipientId: record.creator.id,
    recipientEmail: record.creator.email,
    subject,
    message,
    status: 'sent',
    followUpDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  })

  const [signal] = await db
    .update(outreachSignals)
    .set({ isActedOn: true })
    .where(eq(outreachSignals.id, record.signal.id))
    .returning()

  return NextResponse.json({ signal, provider })
}
