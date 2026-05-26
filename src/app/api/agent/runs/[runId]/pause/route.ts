import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { agentRuns } from '@/lib/db/schema'

type RouteContext = {
  params: { runId: string }
}

export async function POST(_request: Request, { params }: RouteContext) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, params.runId)).limit(1)
  if (!run || run.userId !== authResult.session.user.id) {
    return NextResponse.json({ error: 'Agent run not found' }, { status: 404 })
  }

  await db.update(agentRuns).set({ status: 'paused' }).where(eq(agentRuns.id, params.runId))
  return NextResponse.json({ success: true })
}
