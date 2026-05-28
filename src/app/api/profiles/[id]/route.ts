import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { parseJsonBody } from '@/lib/api/json'
import { calculateSponsorshipReadiness, maybeEnrichProfile } from '@/lib/api/profiles'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  enrichedSummary: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  niche: z.string().nullable().optional(),
  platforms: z.array(z.string()).optional(),
  subscribers: z.number().int().nonnegative().optional(),
  avgViews: z.number().int().nonnegative().optional(),
  views72h: z.number().int().nonnegative().optional(),
  contentLanguage: z.string().optional(),
  contentPurity: z.enum(['pure', 'regional', 'mixed']).optional(),
  secondaryNiche: z.string().nullable().optional(),
  contentMixRatio: z.string().nullable().optional(),
  acceptsSponsorships: z.boolean().optional(),
  engagementRate: z.string().optional(),
  postingFrequency: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  linkInBioEnabled: z.boolean().optional(),
  linkInBioCta: z.string().optional(),
})

type RouteContext = {
  params: {
    id: string
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authResult = await requireAuth()

  if (authResult.error) {
    return authResult.error
  }

  if (authResult.session.user.id !== params.id && authResult.session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [oldProfile] = await db
    .select({
      id: profiles.id,
      enrichedSummary: profiles.enrichedSummary,
      niche: profiles.niche,
      enrichedAt: profiles.enrichedAt,
      views72h: profiles.views72h,
      postingFrequency: profiles.postingFrequency,
      engagementRate: profiles.engagementRate,
      contentPurity: profiles.contentPurity,
      isVerified: profiles.isVerified,
    })
    .from(profiles)
    .where(eq(profiles.id, params.id))
    .limit(1)

  if (!oldProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const body = await parseJsonBody(request)
  if (body.error) return NextResponse.json({ error: body.error }, { status: 400 })

  const parsed = updateProfileSchema.safeParse(body.data)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid profile payload' }, { status: 400 })
  }

  const { enrichedSummary, ...profileUpdates } = parsed.data

  const sponsorshipReadiness = calculateSponsorshipReadiness({
    views72h: parsed.data.views72h ?? oldProfile.views72h,
    postingFrequency: parsed.data.postingFrequency ?? oldProfile.postingFrequency,
    engagementRate: parsed.data.engagementRate ?? oldProfile.engagementRate,
    contentPurity: parsed.data.contentPurity ?? oldProfile.contentPurity,
    isVerified: oldProfile.isVerified,
  })

  const [updatedProfile] = await db
    .update(profiles)
    .set({
      ...profileUpdates,
      ...(enrichedSummary !== undefined ? { enrichedSummary } : {}),
      sponsorshipReadiness: sponsorshipReadiness.toFixed(2),
    })
    .where(eq(profiles.id, params.id))
    .returning()

  void maybeEnrichProfile(
    params.id,
    updatedProfile.niche,
    updatedProfile.enrichedSummary,
    oldProfile.niche,
    oldProfile.enrichedSummary,
    oldProfile.enrichedAt,
  ).catch((error: unknown) => {
    console.error('Profile enrichment failed', error)
  })

  return NextResponse.json({ profile: updatedProfile })
}
