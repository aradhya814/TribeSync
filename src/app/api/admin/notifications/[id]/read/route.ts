import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { adminNotifications } from '@/lib/db/schema'

type RouteContext = {
  params: { id: string }
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  const authResult = await requireAdmin()
  if (authResult.error) return authResult.error

  const [notification] = await db
    .update(adminNotifications)
    .set({ isRead: true })
    .where(eq(adminNotifications.id, params.id))
    .returning()

  if (!notification) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })

  return NextResponse.json({ notification })
}
