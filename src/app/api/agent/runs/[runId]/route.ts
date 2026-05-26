import { and, asc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { agentRuns, agentSteps } from '@/lib/db/schema'

type RouteContext = {
  params: { runId: string }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const [run] = await db
    .select()
    .from(agentRuns)
    .where(and(eq(agentRuns.id, params.runId), eq(agentRuns.userId, authResult.session.user.id)))
    .limit(1)

  if (!run) return NextResponse.json({ error: 'Agent run not found' }, { status: 404 })

  const steps = await db
    .select()
    .from(agentSteps)
    .where(eq(agentSteps.runId, run.id))
    .orderBy(asc(agentSteps.startedAt))

  return NextResponse.json({ run, steps })
}
