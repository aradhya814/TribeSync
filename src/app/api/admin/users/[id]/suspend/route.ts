import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'

type RouteContext = {
  params: { id: string }
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  const authResult = await requireAdmin()
  if (authResult.error) return authResult.error

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, params.id)).limit(1)
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const [updated] = await db
    .update(profiles)
    .set({ status: profile.status === 'suspended' ? 'active' : 'suspended', updatedAt: new Date() })
    .where(eq(profiles.id, params.id))
    .returning()

  return NextResponse.json({ profile: updated })
}
