import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { agentRuns, agentSteps, collabDeals, milestones, outreachSignals } from '@/lib/db/schema'

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const userId = authResult.session.user.id
  const runs = await db.select().from(agentRuns).where(eq(agentRuns.userId, userId))
  const steps = (
    await Promise.all(
      runs.map((run) =>
        db
          .select({ step: agentSteps, run: agentRuns })
          .from(agentSteps)
          .innerJoin(agentRuns, eq(agentRuns.id, agentSteps.runId))
          .where(eq(agentSteps.runId, run.id))
          .orderBy(desc(agentSteps.startedAt))
          .limit(10),
      ),
    )
  )
    .flat()
    .sort((a, b) => new Date(b.step.startedAt ?? 0).getTime() - new Date(a.step.startedAt ?? 0).getTime())
    .slice(0, 10)

  const signals = await db
    .select()
    .from(outreachSignals)
    .where(eq(outreachSignals.forUserId, userId))
    .orderBy(desc(outreachSignals.createdAt))
    .limit(5)

  const deals = await db.select().from(collabDeals)
  const userDeals = deals.filter((deal) => deal.creatorId === userId || deal.msmeId === userId)
  const allMilestones = await db.select().from(milestones)
  const upcomingMilestones = allMilestones
    .filter((milestone) => userDeals.some((deal) => deal.id === milestone.dealId))
    .filter((milestone) => milestone.status !== 'approved')
    .sort((a, b) => new Date(a.dueDate ?? '2999-01-01').getTime() - new Date(b.dueDate ?? '2999-01-01').getTime())
    .slice(0, 3)

  const pendingActions = {
    activeSignals: signals.filter((signal) => !signal.isActedOn).length,
    upcomingMilestones: upcomingMilestones.length,
    waitingAgents: runs.filter((run) => run.status === 'waiting_human').length,
  }

  return NextResponse.json({ steps, signals, upcomingMilestones, pendingActions })
}
