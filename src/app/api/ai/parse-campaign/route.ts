import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { parseJsonBody } from '@/lib/api/json'
import { callClaude } from '@/lib/claude'

const parseSchema = z.object({
  rawBrief: z.string().min(10),
})

type ParsedCampaign = {
  title: string
  goal: string
  niche: string
  budget: number
  deliverables: string
  timeline_days: number
  suggested_min_avg_views: number
  suggested_content_style: string
}

function fallbackParse(rawBrief: string): ParsedCampaign {
  const budgetMatch = rawBrief.match(/(?:rs\.?|inr|₹)?\s?([0-9][0-9,]*)/i)
  const budget = budgetMatch?.[1] ? Number(budgetMatch[1].replace(/,/g, '')) : 0
  const lower = rawBrief.toLowerCase()
  const niche = ['tech', 'fashion', 'food', 'finance', 'fitness'].find((item) => lower.includes(item)) ?? 'general'

  return {
    title: rawBrief.slice(0, 60),
    goal: 'Campaign awareness and qualified creator-led conversions',
    niche,
    budget,
    deliverables: 'Creator content deliverables to be finalized',
    timeline_days: lower.includes('week') ? 14 : 30,
    suggested_min_avg_views: 8000,
    suggested_content_style: lower.includes('tutorial') ? 'tutorial' : 'review',
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const body = await parseJsonBody(request)
  if (body.error) return NextResponse.json({ error: body.error }, { status: 400 })

  const parsed = parseSchema.safeParse(body.data)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid brief' }, { status: 400 })
  }

  try {
    const response = await callClaude(
      `Parse this campaign brief into JSON with title, goal, niche, budget, deliverables, timeline_days, suggested_min_avg_views, suggested_content_style.
Brief: ${parsed.data.rawBrief}`,
      { model: 'haiku', maxTokens: 500 },
    )
    return NextResponse.json(JSON.parse(response) as ParsedCampaign)
  } catch {
    return NextResponse.json(fallbackParse(parsed.data.rawBrief))
  }
}
