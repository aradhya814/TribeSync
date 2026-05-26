import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { campaigns } from '@/lib/db/schema'

type RouteContext = {
  params: { id: string }
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  const authResult = await requireAdmin()
  if (authResult.error) return authResult.error

  const [campaign] = await db.update(campaigns).set({ status: 'live' }).where(eq(campaigns.id, params.id)).returning()
  return NextResponse.json({ campaign })
}
