import { google } from 'googleapis'

export type YouTubeChannelResult = {
  channelId: string
  title: string
  description: string
  thumbnailUrl: string | null
  subscriberCount: number
  avgViews: number
  views72h: number
  channelUrl: string
}

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
})

function toNumber(value: string | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function youtubeChannelUrl(channelId: string) {
  return `https://www.youtube.com/channel/${channelId}`
}

export async function getYouTubeChannelStats(channelId: string): Promise<YouTubeChannelResult | null> {
  if (!process.env.YOUTUBE_API_KEY) return null

  const [channelResponse, velocity] = await Promise.all([
    youtube.channels.list({
      part: ['snippet', 'statistics'],
      id: [channelId],
      maxResults: 1,
    }),
    calculateRecentVideoVelocity(channelId),
  ])

  const channel = channelResponse.data.items?.[0]
  if (!channel?.id) return null

  const subscriberCount = toNumber(channel.statistics?.subscriberCount)
  const videoCount = Math.max(1, toNumber(channel.statistics?.videoCount))
  const totalViews = toNumber(channel.statistics?.viewCount)

  return {
    channelId: channel.id,
    title: channel.snippet?.title ?? 'YouTube creator',
    description: channel.snippet?.description ?? '',
    thumbnailUrl: channel.snippet?.thumbnails?.medium?.url ?? channel.snippet?.thumbnails?.default?.url ?? null,
    subscriberCount,
    avgViews: Math.round(totalViews / videoCount),
    views72h: velocity,
    channelUrl: youtubeChannelUrl(channel.id),
  }
}

export async function searchYouTubeChannels(keyword: string, limit = 10): Promise<YouTubeChannelResult[]> {
  if (!process.env.YOUTUBE_API_KEY) return []

  const response = await youtube.search.list({
    part: ['snippet'],
    q: keyword,
    type: ['channel'],
    maxResults: limit,
  })

  const channelIds = (response.data.items ?? [])
    .map((item) => item.snippet?.channelId)
    .filter((channelId): channelId is string => Boolean(channelId))

  const channels = await Promise.all(channelIds.map((channelId) => getYouTubeChannelStats(channelId)))
  return channels.filter((channel): channel is YouTubeChannelResult => Boolean(channel))
}

async function calculateRecentVideoVelocity(channelId: string) {
  if (!process.env.YOUTUBE_API_KEY) return 0

  const publishedAfter = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const videoSearch = await youtube.search.list({
    part: ['snippet'],
    channelId,
    type: ['video'],
    order: 'date',
    maxResults: 10,
    publishedAfter,
  })

  const videoIds = (videoSearch.data.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((videoId): videoId is string => Boolean(videoId))

  if (videoIds.length === 0) return 0

  const videos = await youtube.videos.list({
    id: videoIds,
    part: ['snippet', 'statistics'],
  })

  const now = Date.now()
  let velocity = 0

  for (const video of videos.data.items ?? []) {
    const publishedAt = video.snippet?.publishedAt ? new Date(video.snippet.publishedAt).getTime() : now
    const ageHours = Math.max(1, (now - publishedAt) / (60 * 60 * 1000))
    const views = toNumber(video.statistics?.viewCount)

    if (ageHours <= 72) {
      velocity += views
    } else {
      velocity += Math.round((views / ageHours) * 72)
    }
  }

  return Math.round(velocity / Math.max(1, videoIds.length))
}
