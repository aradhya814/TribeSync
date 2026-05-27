import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { collabDeals } from '@/lib/db/schema'

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(date: Date) {
  return date.toLocaleString('en-IN', { month: 'short' })
}

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const deals = await db.select().from(collabDeals).where(eq(collabDeals.creatorId, authResult.session.user.id))
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - index))
    return { key: monthKey(date), month: monthLabel(date), initiated: 0, completed: 0 }
  })

  for (const deal of deals) {
    const item = months.find((month) => month.key === monthKey(new Date(deal.createdAt)))
    if (!item) continue
    item.initiated += 1
    if (deal.status === 'completed' || deal.status === 'invoiced' || deal.status === 'paid') item.completed += 1
  }

  return NextResponse.json({ data: months.map(({ month, initiated, completed }) => ({ month, initiated, completed })) })
}
