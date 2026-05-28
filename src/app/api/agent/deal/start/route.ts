import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { parseJsonBody } from '@/lib/api/json'
import { DealOriginationAgent } from '@/lib/agent/deal-agent'
import { db } from '@/lib/db'
import { agentRuns, campaigns } from '@/lib/db/schema'

const startSchema = z.object({
  campaignId: z.string().uuid(),
})

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const body = await parseJsonBody(request)
  if (body.error) return NextResponse.json({ error: body.error }, { status: 400 })

  const parsed = startSchema.safeParse(body.data)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid agent payload' }, { status: 400 })

  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, parsed.data.campaignId)).limit(1)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

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
