import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { callClaude } from '@/lib/claude'

const candidateSchema = z.object({
  id: z.string(),
  fullName: z.string().nullable().optional(),
  niche: z.string().nullable().optional(),
  avgViews: z.number().nullable().optional(),
  viewSubscriberRatio: z.string().nullable().optional(),
  deliveryReliabilityScore: z.string().nullable().optional(),
  enrichedContentStyle: z.string().nullable().optional(),
})

const rankSchema = z.object({
  campaign: z.record(z.string(), z.unknown()),
  candidates: z.array(candidateSchema),
})

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const parsed = rankSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid ranking payload' }, { status: 400 })
  }

  try {
    const response = await callClaude(
      `Rank creators for this campaign. Return JSON { "ranked_ids": string[], "reasons": Record<string,string> }.
Campaign: ${JSON.stringify(parsed.data.campaign)}
Candidates: ${JSON.stringify(parsed.data.candidates)}`,
      { model: 'sonnet', maxTokens: 1200 },
    )
    return NextResponse.json(JSON.parse(response) as { ranked_ids: string[]; reasons: Record<string, string> })
  } catch {
    const ranked = [...parsed.data.candidates].sort((a, b) => (b.avgViews ?? 0) - (a.avgViews ?? 0))
    return NextResponse.json({
      ranked_ids: ranked.map((candidate) => candidate.id),
      reasons: Object.fromEntries(
        ranked.map((candidate) => [candidate.id, `High average views: ${(candidate.avgViews ?? 0).toLocaleString('en-IN')}`]),
      ),
    })
  }
}
