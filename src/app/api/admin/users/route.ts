import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { profiles, userRoles } from '@/lib/db/schema'

export async function GET() {
  const authResult = await requireAdmin()
  if (authResult.error) return authResult.error

  const users = await db
    .select({
      profile: profiles,
      role: userRoles.role,
    })
    .from(profiles)
    .leftJoin(userRoles, eq(userRoles.userId, profiles.id))
    .orderBy(desc(profiles.createdAt))
    .limit(100)

  return NextResponse.json({ users })
}
