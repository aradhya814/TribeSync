import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireCron } from '@/lib/api/auth-check'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  const cronError = requireCron(request)
  if (cronError) return cronError

  await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY market_rates`)

  return NextResponse.json({ refreshed: true })
}
