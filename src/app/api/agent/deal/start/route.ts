import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { DealOriginationAgent } from '@/lib/agent/deal-agent'
import { db } from '@/lib/db'
import { agentRuns, campaigns } from '@/lib/db/schema'

const startSchema = z.object({
  campaignId: z.string().uuid(),
})

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  if (authResult.session.user.role !== 'msme' && authResult.session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = startSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid agent payload' }, { status: 400 })

  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, parsed.data.campaignId)).limit(1)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (authResult.session.user.role !== 'admin' && campaign.createdBy !== authResult.session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [run] = await db
    .insert(agentRuns)
    .values({
      campaignId: campaign.id,
      userId: authResult.session.user.id,
      status: 'pending',
    })
    .returning()

  void new DealOriginationAgent(run.id, campaign.id, authResult.session.user.id).run()

  return NextResponse.json({ runId: run.id })
}
