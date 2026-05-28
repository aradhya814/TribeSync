import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { adminNotifications, campaigns } from '@/lib/db/schema'

type RouteContext = {
  params: { id: string }
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, params.id)).limit(1)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  const [updated] = await db
    .update(campaigns)
    .set({ status: 'pending_review' })
    .where(eq(campaigns.id, params.id))
    .returning()

  await db.insert(adminNotifications).values({
    type: 'campaign_review',
    title: 'Campaign pending review',
    body: updated.title,
    resourceType: 'campaign',
    resourceId: updated.id,
  })

  return NextResponse.json({ campaign: updated })
}
