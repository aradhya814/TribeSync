import { desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { campaigns } from '@/lib/db/schema'

export async function GET() {
  const authResult = await requireAdmin()
  if (authResult.error) return authResult.error

  const rows = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt)).limit(100)

  return NextResponse.json({ campaigns: rows })
}
