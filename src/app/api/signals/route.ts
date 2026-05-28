import { and, desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { outreachSignals, profiles } from '@/lib/db/schema'

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const selectSignals = () =>
    db
      .select({
        signal: outreachSignals,
        creator: {
          id: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email,
          avatarUrl: profiles.avatarUrl,
          niche: profiles.niche,
          avgViews: profiles.avgViews,
        },
      })
      .from(outreachSignals)
      .innerJoin(profiles, eq(profiles.id, outreachSignals.creatorId))

  const signals = await selectSignals()
    .where(and(eq(outreachSignals.forUserId, authResult.session.user.id), eq(outreachSignals.isActedOn, false)))
    .orderBy(desc(outreachSignals.createdAt))

  if (signals.length > 0) return NextResponse.json({ signals })

  const demoSignals = await selectSignals()
    .where(eq(outreachSignals.isActedOn, false))
    .orderBy(desc(outreachSignals.createdAt))
    .limit(10)

  return NextResponse.json({ signals: demoSignals })
}
