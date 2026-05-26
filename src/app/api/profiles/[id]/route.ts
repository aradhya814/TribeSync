import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { maybeEnrichProfile } from '@/lib/api/profiles'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  niche: z.string().nullable().optional(),
  platforms: z.array(z.string()).optional(),
  subscribers: z.number().int().nonnegative().optional(),
  avgViews: z.number().int().nonnegative().optional(),
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
      bio: profiles.bio,
      niche: profiles.niche,
      enrichedAt: profiles.enrichedAt,
    })
    .from(profiles)
    .where(eq(profiles.id, params.id))
    .limit(1)

  if (!oldProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateProfileSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid profile payload' }, { status: 400 })
  }

  const [profile] = await db
    .update(profiles)
    .set(parsed.data)
    .where(eq(profiles.id, params.id))
    .returning()

  void maybeEnrichProfile(
    params.id,
    profile.niche,
    profile.bio,
    oldProfile.niche,
    oldProfile.bio,
    oldProfile.enrichedAt,
  ).catch((error: unknown) => {
    console.error('Profile enrichment failed', error)
  })

  return NextResponse.json({ profile })
}
