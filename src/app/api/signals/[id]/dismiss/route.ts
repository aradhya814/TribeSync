import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { outreachSignals } from '@/lib/db/schema'

type RouteContext = {
  params: { id: string }
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const [signal] = await db
    .update(outreachSignals)
    .set({ isActedOn: true })
    .where(and(eq(outreachSignals.id, params.id), eq(outreachSignals.forUserId, authResult.session.user.id)))
    .returning()

  if (!signal) return NextResponse.json({ error: 'Signal not found' }, { status: 404 })

  return NextResponse.json({ signal })
}
