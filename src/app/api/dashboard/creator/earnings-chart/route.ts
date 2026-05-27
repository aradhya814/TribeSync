import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { collabDeals } from '@/lib/db/schema'

function monthLabel(date: Date) {
  return date.toLocaleString('en-IN', { month: 'short' })
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const deals = await db.select().from(collabDeals).where(eq(collabDeals.creatorId, authResult.session.user.id))
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (11 - index))
    return { key: monthKey(date), month: monthLabel(date), earnings: 0 }
  })

  for (const deal of deals) {
    if (deal.status !== 'paid') continue
    const key = monthKey(new Date(deal.createdAt))
    const item = months.find((month) => month.key === key)
    if (item) item.earnings += Number(deal.creatorPayout ?? 0)
  }

  return NextResponse.json({ data: months.map(({ month, earnings }) => ({ month, earnings })) })
}
