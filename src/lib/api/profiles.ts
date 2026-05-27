import { and, eq, isNull, lt, or } from 'drizzle-orm'

import { callClaude } from '@/lib/claude'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'

type EnrichmentResult = {
  summary: string
  tags: string[]
  contentStyle: string
}

type SponsorshipProfile = {
  views72h?: number | null
  postingFrequency?: string | null
  engagementRate?: string | number | null
  contentPurity?: string | null
  isVerified?: boolean | null
}

export function calculateSponsorshipReadiness(profile: SponsorshipProfile) {
  let score = 0

  if ((profile.views72h ?? 0) >= 80000) score += 0.4

  const postingFrequency = profile.postingFrequency?.toLowerCase()
  if (postingFrequency === 'weekly') score += 0.2
  if (postingFrequency === 'biweekly') score += 0.1

  if (Number(profile.engagementRate ?? 0) >= 3) score += 0.2
  if (profile.contentPurity === 'pure') score += 0.1
  if (profile.isVerified) score += 0.1

  return Math.min(1, Math.round(score * 100) / 100)
}

function shouldEnrich(
  newNiche: string | null | undefined,
  newSummary: string | null | undefined,
  oldNiche: string | null | undefined,
  oldSummary: string | null | undefined,
  enrichedAt: Date | string | null | undefined,
) {
  const nicheChanged = newNiche !== oldNiche
  const summaryChanged = newSummary !== oldSummary

  if (!nicheChanged && !summaryChanged) {
    return false
  }

  if (!enrichedAt) {
    return true
  }

  const lastEnrichedAt = new Date(enrichedAt).getTime()
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  return lastEnrichedAt < oneDayAgo
}

function parseEnrichment(raw: string): EnrichmentResult {
  try {
    const parsed = JSON.parse(raw) as Partial<EnrichmentResult>
    return {
      summary: parsed.summary ?? '',
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      contentStyle: parsed.contentStyle ?? '',
    }
  } catch {
    return {
      summary: raw.slice(0, 500),
      tags: [],
      contentStyle: 'general',
    }
  }
}

export async function maybeEnrichProfile(
  profileId: string,
  newNiche: string | null | undefined,
  newSummary: string | null | undefined,
  oldNiche: string | null | undefined,
  oldSummary: string | null | undefined,
  enrichedAt: Date | string | null | undefined,
) {
  if (!shouldEnrich(newNiche, newSummary, oldNiche, oldSummary, enrichedAt)) {
    return
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [profile] = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      niche: profiles.niche,
      enrichedSummary: profiles.enrichedSummary,
      avgViews: profiles.avgViews,
      platforms: profiles.platforms,
    })
    .from(profiles)
    .where(
      and(
        eq(profiles.id, profileId),
        or(lt(profiles.enrichedAt, twentyFourHoursAgo), isNull(profiles.enrichedAt)),
      ),
    )
    .limit(1)

  if (!profile) {
    return
  }

  const response = await callClaude(
    `Return JSON with summary, tags, contentStyle for this creator profile.
Name: ${profile.fullName ?? 'Unknown'}
Niche: ${profile.niche ?? 'Unknown'}
Summary: ${profile.enrichedSummary ?? ''}
Average views: ${profile.avgViews ?? 0}
Platforms: ${(profile.platforms ?? []).join(', ')}`,
    { model: 'haiku', maxTokens: 500 },
  )

  const enrichment = parseEnrichment(response)

  await db
    .update(profiles)
    .set({
      enrichedSummary: enrichment.summary,
      enrichedTags: enrichment.tags,
      enrichedContentStyle: enrichment.contentStyle,
      enrichedAt: new Date(),
    })
    .where(eq(profiles.id, profileId))
}
