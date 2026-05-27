import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/api/auth-check'
import { importCreatorCandidates } from '@/lib/creator-acquisition'

const searchSchema = z.object({
  niche: z.string().min(2),
  source: z.enum(['vidiq', 'youtube']).default('vidiq'),
  limit: z.number().int().min(1).max(20).default(10),
})

export async function POST(request: Request) {
  const authResult = await requireAdmin()
  if (authResult.error) return authResult.error

  const parsed = searchSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid acquisition search payload' }, { status: 400 })
  }

  const creators = await importCreatorCandidates(parsed.data)
  return NextResponse.json({
    creators,
    sourceUsed: creators.some((creator) => creator.source === 'vidiq') ? 'vidiq' : 'youtube',
  })
}
