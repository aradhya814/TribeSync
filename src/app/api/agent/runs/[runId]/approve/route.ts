import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createDeal } from '@/lib/api/deals'
import { requireAuth } from '@/lib/api/auth-check'
import { parseJsonBody } from '@/lib/api/json'
import { db } from '@/lib/db'
import { agentRuns, agentSteps, campaigns } from '@/lib/db/schema'
import { pusherServer } from '@/lib/pusher'

type RouteContext = {
  params: { runId: string }
}

const approveSchema = z.object({
  creatorId: z.string().uuid(),
})

export async function POST(request: Request, { params }: RouteContext) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const body = await parseJsonBody(request)
  if (body.error) return NextResponse.json({ error: body.error }, { status: 400 })

  const parsed = approveSchema.safeParse(body.data)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid approval payload' }, { status: 400 })

  const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, params.runId)).limit(1)
  if (!run || run.userId !== authResult.session.user.id) {
    return NextResponse.json({ error: 'Agent run not found' }, { status: 404 })
  }

  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, run.campaignId)).limit(1)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const deal = await createDeal({
    campaignId: campaign.id,
    creatorId: parsed.data.creatorId,
    msmeId: authResult.session.user.id,
    agreedAmount: campaign.budget ?? '0',
  })

  const [step] = await db
    .insert(agentSteps)
    .values({
      runId: run.id,
      stepKey: 'human_approved',
      label: 'Creator approved by you',
      detail: 'Deal created automatically',
      status: 'completed',
      outputData: { dealId: deal.id },
      completedAt: new Date(),
    })
    .returning()

  const [updatedRun] = await db
    .update(agentRuns)
    .set({ status: 'completed', summary: 'Creator approved and deal created', completedAt: new Date() })
    .where(eq(agentRuns.id, run.id))
    .returning()

  await pusherServer.trigger(`private-agent-${run.id}`, 'step-update', { step })
  await pusherServer.trigger(`private-agent-${run.id}`, 'run-complete', { run: updatedRun })

  return NextResponse.json({ dealId: deal.id })
}
