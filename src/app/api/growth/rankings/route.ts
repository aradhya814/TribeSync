import { asc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { profiles, rankings } from '@/lib/db/schema'

export async function GET(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const period = new URL(request.url).searchParams.get('period') ?? 'weekly'
  const rows = await db
    .select({
      ranking: rankings,
      profile: {
        id: profiles.id,
        fullName: profiles.fullName,
        email: profiles.email,
        avatarUrl: profiles.avatarUrl,
        niche: profiles.niche,
        avgViews: profiles.avgViews,
      },
    })
    .from(rankings)
    .innerJoin(profiles, eq(profiles.id, rankings.userId))
    .where(eq(rankings.period, period))
    .orderBy(asc(rankings.rankPosition))
    .limit(100)

  return NextResponse.json({ rankings: rows, currentUserId: authResult.session.user.id })
}
