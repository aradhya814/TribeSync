import { and, desc, eq, inArray, ne, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { agentRuns, agentSteps, collabDeals, milestones, outreachSignals } from '@/lib/db/schema'

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const userId = authResult.session.user.id

  // Fetch user's agent runs, signals, and deals in parallel
  const [runs, signals, userDeals] = await Promise.all([
    db.select().from(agentRuns).where(eq(agentRuns.userId, userId)),
    db
      .select()
      .from(outreachSignals)
      .where(eq(outreachSignals.forUserId, userId))
      .orderBy(desc(outreachSignals.createdAt))
      .limit(5),
    // Filter deals at DB level — never fetch the full table
    db
      .select()
      .from(collabDeals)
      .where(or(eq(collabDeals.creatorId, userId), eq(collabDeals.msmeId, userId))),
  ])

  // Batch all step queries into a single IN query instead of N+1
  const runIds = runs.map((run) => run.id)
  const [allSteps, upcomingMilestones] = await Promise.all([
    runIds.length > 0
      ? db
          .select({ step: agentSteps, run: agentRuns })
          .from(agentSteps)
          .innerJoin(agentRuns, eq(agentRuns.id, agentSteps.runId))
          .where(inArray(agentSteps.runId, runIds))
          .orderBy(desc(agentSteps.startedAt))
          .limit(50)
      : Promise.resolve([]),
    // Filter milestones at DB level using the user's deal IDs
    userDeals.length > 0
      ? db
          .select()
          .from(milestones)
          .where(
            and(
              inArray(milestones.dealId, userDeals.map((deal) => deal.id)),
              ne(milestones.status, 'approved'),
            ),
          )
          .orderBy(milestones.dueDate)
          .limit(3)
      : Promise.resolve([]),
  ])

  const steps = allSteps
    .sort((a, b) => new Date(b.step.startedAt ?? 0).getTime() - new Date(a.step.startedAt ?? 0).getTime())
    .slice(0, 10)

  const pendingActions = {
    activeSignals: signals.filter((signal) => !signal.isActedOn).length,
    upcomingMilestones: upcomingMilestones.length,
    waitingAgents: runs.filter((run) => run.status === 'waiting_human').length,
  }

  return NextResponse.json({ steps, signals, upcomingMilestones, pendingActions })
}
