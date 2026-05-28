import { eq } from 'drizzle-orm'
import { google } from 'googleapis'
import { NextResponse } from 'next/server'

import { calculateSponsorshipReadiness } from '@/lib/api/profiles'
import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { calculateRecentVideoVelocity } from '@/lib/youtube'

export async function GET(request: Request) {
  const baseUrl = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const settingsUrl = `${baseUrl}/platform/settings`

  const authResult = await requireAuth()
  if (authResult.error) {
    return NextResponse.redirect(`${settingsUrl}?youtube_error=session_expired`)
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError || !code) {
    return NextResponse.redirect(`${settingsUrl}?youtube_error=access_denied`)
  }

  // state is the user ID set in /api/auth/youtube — verify it matches the session
  if (state !== authResult.session.user.id) {
    return NextResponse.redirect(`${settingsUrl}?youtube_error=state_mismatch`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${settingsUrl}?youtube_error=not_configured`)
  }

  const redirectUri = `${baseUrl}/api/auth/youtube/callback`
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  try {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)
  } catch {
    return NextResponse.redirect(`${settingsUrl}?youtube_error=token_exchange_failed`)
  }

  const yt = google.youtube({ version: 'v3', auth: oauth2Client })

  let channel
  try {
    const response = await yt.channels.list({
      part: ['snippet', 'statistics'],
      mine: true,
      maxResults: 1,
    })
    channel = response.data.items?.[0]
  } catch {
    return NextResponse.redirect(`${settingsUrl}?youtube_error=channel_fetch_failed`)
  }

  if (!channel?.id) {
    return NextResponse.redirect(`${settingsUrl}?youtube_error=no_channel`)
  }

  const channelId = channel.id
  const subscriberCount = Number(channel.statistics?.subscriberCount ?? 0)
  const videoCount = Math.max(1, Number(channel.statistics?.videoCount ?? 1))
  const totalViews = Number(channel.statistics?.viewCount ?? 0)
  const avgViews = Math.round(totalViews / videoCount)

  // Compute 72h velocity using the same algorithm as the search pipeline
  const views72h = await calculateRecentVideoVelocity(channelId).catch(() => 0)

  const sponsorshipReadiness = calculateSponsorshipReadiness({
    views72h,
    postingFrequency: 'weekly',
    engagementRate: 0,
    contentPurity: 'pure',
    isVerified: true,
  })

  await db
    .update(profiles)
    .set({
      youtubeChannelId: channelId,
      youtubeChannelUrl: `https://www.youtube.com/channel/${channelId}`,
      subscribers: subscriberCount,
      avgViews,
      views72h,
      verifiedAvgViews: avgViews,
      isVerified: true,
      dataSource: 'youtube_oauth',
      trustMultiplier: '0.95',
      sponsorshipReadiness: sponsorshipReadiness.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, authResult.session.user.id))

  return NextResponse.redirect(`${settingsUrl}?youtube_connected=1`)
}
