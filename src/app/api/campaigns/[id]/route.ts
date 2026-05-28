import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { parseJsonBody } from '@/lib/api/json'
import { db } from '@/lib/db'
import { campaigns } from '@/lib/db/schema'

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().nullable().optional(),
  goal: z.string().nullable().optional(),
  niche: z.string().nullable().optional(),
  budget: z.string().optional(),
  status: z.enum(['draft', 'pending_review', 'live', 'completed', 'archived']).optional(),
  minAvgViews: z.number().int().nonnegative().optional(),
  minSubscribers: z.number().int().nonnegative().optional(),
  requiredPlatforms: z.array(z.string()).optional(),
  requiredContentStyle: z.string().nullable().optional(),
  deliverables: z.string().nullable().optional(),
})

type RouteContext = {
  params: { id: string }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, params.id)).limit(1)

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  return NextResponse.json({ campaign })
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, params.id)).limit(1)

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const body = await parseJsonBody(request)
  if (body.error) return NextResponse.json({ error: body.error }, { status: 400 })

  const parsed = updateSchema.safeParse(body.data)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid campaign payload' }, { status: 400 })
  }

  const [updated] = await db.update(campaigns).set(parsed.data).where(eq(campaigns.id, params.id)).returning()
  return NextResponse.json({ campaign: updated })
}
