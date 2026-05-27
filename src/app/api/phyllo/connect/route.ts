import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { createPhylloConnectToken } from '@/lib/phyllo'

export async function POST() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  if (authResult.session.user.role !== 'creator') {
    return NextResponse.json({ error: 'Only creators can connect Phyllo' }, { status: 403 })
  }

  const [profile] = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      phylloUserId: profiles.phylloUserId,
    })
    .from(profiles)
    .where(eq(profiles.id, authResult.session.user.id))
    .limit(1)

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const token = await createPhylloConnectToken(profile).catch(() => null)
  if (!token) {
    return NextResponse.json({ error: 'Social account connection is not configured yet' }, { status: 503 })
  }

  return NextResponse.json(token)
}
