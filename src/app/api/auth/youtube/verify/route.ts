import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { calculateSponsorshipReadiness } from '@/lib/api/profiles'
import { requireAuth } from '@/lib/api/auth-check'
import { parseJsonBody } from '@/lib/api/json'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { getChannelByUrl } from '@/lib/youtube'

const schema = z.object({
  channelUrl: z.string().min(3),
})

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const body = await parseJsonBody(request)
  if (body.error) return NextResponse.json({ error: body.error }, { status: 400 })

  const parsed = schema.safeParse(body.data)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Channel URL is required' }, { status: 400 })
  }

  const channel = await getChannelByUrl(parsed.data.channelUrl)
  if (!channel) {
    return NextResponse.json({ error: 'Channel not found. Check the URL and try again.' }, { status: 404 })
  }

  const sponsorshipReadiness = calculateSponsorshipReadiness({
    views72h: channel.views72h,
    postingFrequency: 'weekly',
    engagementRate: 0,
    contentPurity: 'pure',
    isVerified: false,
  })

  await db
    .update(profiles)
    .set({
      youtubeChannelId: channel.channelId,
      youtubeChannelUrl: channel.channelUrl,
      subscribers: channel.subscriberCount,
      avgViews: channel.avgViews,
      views72h: channel.views72h,
      verifiedAvgViews: channel.avgViews,
      dataSource: 'youtube_api',
      trustMultiplier: '0.80',
      sponsorshipReadiness: sponsorshipReadiness.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, authResult.session.user.id))

  return NextResponse.json({
    success: true,
    channel: {
      title: channel.title,
      subscribers: channel.subscriberCount,
      avgViews: channel.avgViews,
      views72h: channel.views72h,
      channelUrl: channel.channelUrl,
    },
  })
}
