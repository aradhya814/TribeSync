import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { adminNotifications, campaigns } from '@/lib/db/schema'

type RouteContext = {
  params: { id: string }
}

const rejectSchema = z.object({
  reason: z.string().optional(),
})

export async function PATCH(request: Request, { params }: RouteContext) {
  const authResult = await requireAdmin()
  if (authResult.error) return authResult.error

  const parsed = rejectSchema.safeParse(await request.json())
  const [campaign] = await db.update(campaigns).set({ status: 'draft' }).where(eq(campaigns.id, params.id)).returning()

  await db.insert(adminNotifications).values({
    type: 'campaign_rejected',
    title: 'Campaign rejected',
    body: parsed.success ? parsed.data.reason ?? 'No reason provided' : 'No reason provided',
    resourceType: 'campaign',
    resourceId: campaign.id,
  })

  return NextResponse.json({ campaign })
}
