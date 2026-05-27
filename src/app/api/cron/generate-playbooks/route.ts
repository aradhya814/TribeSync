import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireCron } from '@/lib/api/auth-check'
import { callClaude } from '@/lib/claude'
import { db } from '@/lib/db'
import { playbooks, profiles, type PlaybookTactic } from '@/lib/db/schema'

function weekOf() {
  const date = new Date()
  date.setDate(date.getDate() - date.getDay() + 1)
  return date.toISOString().slice(0, 10)
}

function parseTactics(raw: string): PlaybookTactic[] {
  try {
    const parsed = JSON.parse(raw) as PlaybookTactic[]
    return Array.isArray(parsed) ? parsed.slice(0, 5) : []
  } catch {
    return []
  }
}

function fallbackTactics(niche: string): PlaybookTactic[] {
  return [
    {
      title: `${niche} hook audit`,
      description: 'Review the first 3 seconds of recent posts and tighten the opening promise.',
      difficulty: 'medium',
      expectedImpact: 'Higher retention',
      timeEstimate: '45 minutes',
      emoji: '1',
      proTips: ['Compare your top two posts before changing format.'],
    },
  ]
}

export async function POST(request: Request) {
  const cronError = requireCron(request)
  if (cronError) return cronError

  const activeCreators = await db.select().from(profiles).where(eq(profiles.status, 'active'))
  const niches = Array.from(new Set(['general', ...activeCreators.map((creator) => creator.niche).filter(Boolean)])) as string[]
  const currentWeek = weekOf()
  let generated = 0

  for (const niche of niches) {
    const [existing] = await db
      .select()
      .from(playbooks)
      .where(and(eq(playbooks.niche, niche), eq(playbooks.weekOf, currentWeek)))
      .limit(1)
    if (existing) continue

    let tactics = fallbackTactics(niche)
    try {
      const response = await callClaude(
        `Return JSON array of 5 tactics for Indian creators in niche "${niche}".
Each tactic: title, description, difficulty, expectedImpact, timeEstimate, emoji, proTips array.
No markdown.`,
        { model: 'haiku', maxTokens: 900 },
      )
      tactics = parseTactics(response)
      if (tactics.length === 0) tactics = fallbackTactics(niche)
    } catch {
      tactics = fallbackTactics(niche)
    }

    await db
      .insert(playbooks)
      .values({ niche, weekOf: currentWeek, tactics })
      .onConflictDoUpdate({
        target: [playbooks.niche, playbooks.weekOf],
        set: { tactics, generatedAt: new Date() },
      })

    generated += 1
  }

  return NextResponse.json({ generated })
}
