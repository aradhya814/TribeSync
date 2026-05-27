import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { adminNotifications } from '@/lib/db/schema'

export async function GET() {
  const authResult = await requireAdmin()
  if (authResult.error) return authResult.error

  const notifications = await db
    .select()
    .from(adminNotifications)
    .where(eq(adminNotifications.isRead, false))
    .orderBy(desc(adminNotifications.createdAt))

  return NextResponse.json({ notifications })
}
