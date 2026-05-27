import { eq, or } from 'drizzle-orm'

import { calculateSponsorshipReadiness } from '@/lib/api/profiles'
import { db } from '@/lib/db'
import { notificationPrefs, profiles, userRoles } from '@/lib/db/schema'
import { searchVidiqBreakoutChannels, type VidiqBreakoutChannel } from '@/lib/vidiq'
import { getYouTubeChannelStats, searchYouTubeChannels, youtubeChannelUrl, type YouTubeChannelResult } from '@/lib/youtube'

export type CreatorAcquisitionSource = 'vidiq' | 'youtube'

export type CreatorAcquisitionResult = {
  profileId: string
  channelId: string
  title: string
  niche: string
  subscribers: number
  avgViews: number
  views72h: number
  outlierScore: number | null
  source: CreatorAcquisitionSource
  imported: boolean
}

function importedEmail(channelId: string) {
  return `youtube-${channelId.toLowerCase()}@imports.tribesync.local`
}

function contentLanguageFromKeyword(keyword: string) {
  const normalized = keyword.toLowerCase()
  if (normalized.includes('hindi')) return 'hi'
  if (normalized.includes('tamil')) return 'ta'
  if (normalized.includes('telugu')) return 'te'
  if (normalized.includes('regional')) return 'regional'
  return 'en'
}

function mergedStats(channel: YouTubeChannelResult, vidiqChannel: VidiqBreakoutChannel | null) {
  return {
    channelId: channel.channelId,
    subscribers: channel.subscriberCount,
    avgViews: channel.avgViews,
    views72h: Math.max(channel.views72h, Math.round(vidiqChannel?.viewVelocity72h ?? 0)),
    outlierScore: vidiqChannel?.outlierScore ?? null,
    title: channel.title || vidiqChannel?.title || 'YouTube creator',
    description: channel.description || vidiqChannel?.description || '',
    thumbnailUrl: channel.thumbnailUrl ?? vidiqChannel?.thumbnailUrl ?? null,
    channelUrl: channel.channelUrl || vidiqChannel?.channelUrl || youtubeChannelUrl(channel.channelId),
  }
}

async function upsertPendingCreator(input: {
  channel: YouTubeChannelResult
  vidiqChannel: VidiqBreakoutChannel | null
  niche: string
  source: CreatorAcquisitionSource
}) {
  const stats = mergedStats(input.channel, input.vidiqChannel)
  const email = importedEmail(input.channel.channelId)
  const sponsorshipReadiness = calculateSponsorshipReadiness({
    views72h: stats.views72h,
    postingFrequency: 'weekly',
    engagementRate: '0',
    contentPurity: 'pure',
    isVerified: false,
  })

  const profileValues = {
    email,
    fullName: stats.title,
    avatarUrl: stats.thumbnailUrl,
    niche: input.niche,
    platforms: ['youtube'],
    subscribers: stats.subscribers,
    avgViews: stats.avgViews,
    views72h: stats.views72h,
    contentLanguage: contentLanguageFromKeyword(input.niche),
    contentPurity: 'pure',
    sponsorshipReadiness: sponsorshipReadiness.toFixed(2),
    acceptsSponsorships: true,
    enrichedSummary: stats.description.slice(0, 500),
    enrichedTags: [input.niche, 'youtube', input.source],
    enrichedContentStyle: 'video',
    youtubeChannelId: input.channel.channelId,
    youtubeChannelUrl: stats.channelUrl,
    vidiqOutlierScore: stats.outlierScore?.toFixed(2) ?? '0',
    vidiqViewVelocity: stats.views72h,
    dataSource: input.source === 'vidiq' ? 'vidiq_youtube_import' : 'youtube_import',
    trustMultiplier: input.source === 'vidiq' ? '0.80' : '0.75',
    status: 'pending' as const,
    updatedAt: new Date(),
  }

  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(or(eq(profiles.youtubeChannelId, input.channel.channelId), eq(profiles.email, email)))
    .limit(1)

  if (existing) {
    const updateValues = Object.fromEntries(
      Object.entries(profileValues).filter(([key]) => key !== 'email' && key !== 'status'),
    ) as Partial<typeof profileValues>

    const [profile] = await db
      .update(profiles)
      .set(updateValues)
      .where(eq(profiles.id, existing.id))
      .returning({ id: profiles.id })

    return { profileId: profile.id, imported: false, stats }
  }

  const [created] = await db
    .insert(profiles)
    .values(profileValues)
    .returning({ id: profiles.id })

  await db.insert(userRoles).values({ userId: created.id, role: 'creator' })
  await db.insert(notificationPrefs).values({ userId: created.id })

  return { profileId: created.id, imported: true, stats }
}

async function importVidiqCreators(niche: string, limit: number) {
  const vidiqChannels = await searchVidiqBreakoutChannels({ keyword: niche, limit })
  const stats = await Promise.all(
    vidiqChannels.map(async (channel) => ({
      vidiqChannel: channel,
      channel: await getYouTubeChannelStats(channel.channelId),
    })),
  )

  return stats
    .filter((item): item is { vidiqChannel: VidiqBreakoutChannel; channel: YouTubeChannelResult } => Boolean(item.channel))
    .sort((a, b) => {
      const scoreDelta = b.vidiqChannel.outlierScore - a.vidiqChannel.outlierScore
      if (scoreDelta !== 0) return scoreDelta
      return b.vidiqChannel.viewVelocity72h - a.vidiqChannel.viewVelocity72h
    })
}

export async function importCreatorCandidates({
  niche,
  source,
  limit = 10,
}: {
  niche: string
  source: CreatorAcquisitionSource
  limit?: number
}) {
  const vidiqItems = source === 'vidiq' ? await importVidiqCreators(niche, limit) : []
  const youtubeFallback = vidiqItems.length === 0
    ? (await searchYouTubeChannels(niche, limit)).map((channel) => ({ channel, vidiqChannel: null }))
    : []

  const candidates = [...vidiqItems, ...youtubeFallback].slice(0, limit)
  const imported = await Promise.all(
    candidates.map((candidate) => upsertPendingCreator({
      channel: candidate.channel,
      vidiqChannel: candidate.vidiqChannel,
      niche,
      source: candidate.vidiqChannel ? 'vidiq' : 'youtube',
    })),
  )

  return imported
    .map((item) => ({
      profileId: item.profileId,
      channelId: item.stats.channelId,
      title: item.stats.title,
      niche,
      subscribers: item.stats.subscribers,
      avgViews: item.stats.avgViews,
      views72h: item.stats.views72h,
      outlierScore: item.stats.outlierScore,
      source: item.stats.outlierScore === null ? 'youtube' as const : 'vidiq' as const,
      imported: item.imported,
    }))
    .sort((a, b) => {
      const scoreDelta = (b.outlierScore ?? 0) - (a.outlierScore ?? 0)
      if (scoreDelta !== 0) return scoreDelta
      return b.views72h - a.views72h
    })
}
