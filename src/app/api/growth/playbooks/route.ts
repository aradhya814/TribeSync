import { desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { playbooks } from '@/lib/db/schema'

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const rows = await db.select().from(playbooks).orderBy(desc(playbooks.generatedAt)).limit(20)

  return NextResponse.json({ playbooks: rows })
}
