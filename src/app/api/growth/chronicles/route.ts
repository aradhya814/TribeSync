import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { collabDeals, tribesyncChronicles, type JsonRecord } from '@/lib/db/schema'

function currentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const chronicles = await db
    .select()
    .from(tribesyncChronicles)
    .where(eq(tribesyncChronicles.userId, authResult.session.user.id))
    .orderBy(desc(tribesyncChronicles.generatedAt))

  return NextResponse.json({ chronicles })
}

export async function POST() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const deals = await db.select().from(collabDeals).where(eq(collabDeals.creatorId, authResult.session.user.id))
  const month = currentMonth()
  const metrics: JsonRecord = {
    deals: deals.length,
    completedDeals: deals.filter((deal) => deal.status === 'completed' || deal.status === 'invoiced' || deal.status === 'paid').length,
    earnings: deals.reduce((sum, deal) => sum + Number(deal.creatorPayout ?? 0), 0),
  }

  const [chronicle] = await db
    .insert(tribesyncChronicles)
    .values({
      userId: authResult.session.user.id,
      month,
      title: `${month} creator chronicle`,
      metrics,
      insights: ['Generated on demand from current deal data.'],
      generatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [tribesyncChronicles.userId, tribesyncChronicles.month],
      set: {
        title: `${month} creator chronicle`,
        metrics,
        insights: ['Generated on demand from current deal data.'],
        generatedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning()

  return NextResponse.json({ chronicle })
}
