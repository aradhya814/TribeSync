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

// Resolves a YouTube channel URL or @handle to stats using the API key only — no OAuth needed.
// Supports: youtube.com/channel/UCxxx, youtube.com/@handle, youtube.com/c/name, bare channel IDs
export async function getChannelByUrl(input: string): Promise<YouTubeChannelResult | null> {
  if (!process.env.YOUTUBE_API_KEY) return null

  const cleaned = input.trim().replace(/^https?:\/\/(www\.)?youtube\.com\//, '')

  // Direct channel ID
  if (cleaned.startsWith('channel/')) {
    const channelId = cleaned.replace('channel/', '').split('?')[0] ?? ''
    return getYouTubeChannelStats(channelId)
  }

  // @handle
  const handle = cleaned.startsWith('@') ? cleaned.split('?')[0] : null

  if (handle) {
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      forHandle: handle.replace('@', ''),
      maxResults: 1,
    })
    const channel = response.data.items?.[0]
    if (!channel?.id) return null
    return getYouTubeChannelStats(channel.id)
  }

  // Legacy /c/name or bare keyword — fall back to search
  const keyword = cleaned.replace(/^c\//, '').split('?')[0] ?? input
  const results = await searchYouTubeChannels(keyword, 1)
  return results[0] ?? null
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

export async function calculateRecentVideoVelocity(channelId: string) {
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
