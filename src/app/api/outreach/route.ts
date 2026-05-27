import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { outreachLogs } from '@/lib/db/schema'

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const logs = await db
    .select()
    .from(outreachLogs)
    .where(eq(outreachLogs.senderId, authResult.session.user.id))
    .orderBy(desc(outreachLogs.sentAt))
    .limit(50)

  const replied = logs.filter((log) => log.respondedAt || log.status === 'replied').length
  const responseRate = logs.length > 0 ? Math.round((replied / logs.length) * 100) : 0

  return NextResponse.json({ logs, stats: { sent: logs.length, replied, responseRate } })
}
