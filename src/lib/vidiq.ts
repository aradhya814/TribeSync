import { getYouTubeChannelStats, searchYouTubeChannels, youtubeChannelUrl } from '@/lib/youtube'

export type VidiqBreakoutChannel = {
  channelId: string
  title: string
  description?: string
  thumbnailUrl?: string | null
  channelUrl?: string
  outlierScore: number
  viewVelocity72h: number
  nicheKeyword: string
}

type VidiqSearchInput = {
  keyword: string
  limit?: number
}

// outlierScore = how much more views the channel is getting right now vs its historical average.
// e.g. avgViews=10K, views72h=80K → score=8.0 (channel is 8x breakout)
function computeOutlierScore(avgViews: number, views72h: number) {
  if (avgViews <= 0) return 0
  return Math.round((views72h / avgViews) * 100) / 100
}

// Native path: compute breakout score directly from YouTube Data API
async function searchBreakoutChannelsNative(keyword: string, limit: number): Promise<VidiqBreakoutChannel[]> {
  const channels = await searchYouTubeChannels(keyword, Math.ceil(limit * 1.5))

  return channels
    .map((channel): VidiqBreakoutChannel => ({
      channelId: channel.channelId,
      title: channel.title,
      description: channel.description,
      thumbnailUrl: channel.thumbnailUrl,
      channelUrl: channel.channelUrl || youtubeChannelUrl(channel.channelId),
      outlierScore: computeOutlierScore(channel.avgViews, channel.views72h),
      viewVelocity72h: channel.views72h,
      nicheKeyword: keyword,
    }))
    .sort((a, b) => {
      const scoreDelta = b.outlierScore - a.outlierScore
      if (scoreDelta !== 0) return scoreDelta
      return b.viewVelocity72h - a.viewVelocity72h
    })
    .slice(0, limit)
}

// External path: calls a VidIQ MCP or compatible endpoint if configured
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return ''
}

function pickNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    const parsed = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

// VidIQ MCP returns SSE: "event: message\ndata: {...}\n\n"
// Navigate: parsed.result.structuredContent.channels
function parseVidiqSseResponse(text: string): unknown {
  const dataLine = text.split('\n').find((line) => line.startsWith('data: '))
  if (!dataLine) return null
  try {
    return JSON.parse(dataLine.slice(6))
  } catch {
    return null
  }
}

function normalizeVidiqChannels(payload: unknown, keyword: string): VidiqBreakoutChannel[] {
  const root = asRecord(payload)
  const result = asRecord(root?.result)
  const structured = asRecord(result?.structuredContent)

  // VidIQ MCP response: result.structuredContent.channels
  // Fallback to legacy formats for any future-proofing
  const candidates = Array.isArray(structured?.channels)
    ? structured.channels
    : Array.isArray(root?.channels) ? root.channels
    : Array.isArray(root?.results) ? root.results
    : Array.isArray(result?.channels) ? result.channels
    : Array.isArray(payload) ? payload
    : []

  return (candidates as unknown[])
    .map((candidate): VidiqBreakoutChannel | null => {
      const record = asRecord(candidate)
      if (!record) return null
      const channelId = pickString(record, ['channelId', 'channel_id', 'youtubeChannelId', 'id'])
      if (!channelId) return null

      // subsGrowth30d is VidIQ's primary breakout signal (% subscriber growth in 30 days)
      const subsGrowth = pickNumber(record, ['subsGrowth30d', 'subs_growth_30d', 'subscriberGrowth'])
      const score = pickNumber(record, ['score', 'outlierScore', 'outlier_score'])
      const viewCount = pickNumber(record, ['viewCount', 'totalViews'])
      const videoCount = Math.max(1, pickNumber(record, ['videoCount', 'video_count']))

      return {
        channelId,
        title: pickString(record, ['channelTitle', 'title', 'name']) || 'YouTube creator',
        description: pickString(record, ['description', 'summary']),
        thumbnailUrl: pickString(record, ['thumbnailUrl', 'thumbnail_url', 'avatarUrl']) || null,
        channelUrl: `https://www.youtube.com/channel/${channelId}`,
        // subsGrowth30d as primary; fall back to VidIQ score if growth data missing
        outlierScore: subsGrowth > 0 ? subsGrowth : score,
        // Estimate 72h velocity from avg views per video (YouTube API fills in the real value later)
        viewVelocity72h: Math.round((viewCount / videoCount) * 0.3),
        nicheKeyword: keyword,
      }
    })
    .filter((ch): ch is VidiqBreakoutChannel => Boolean(ch))
    .sort((a, b) => {
      const scoreDelta = b.outlierScore - a.outlierScore
      if (scoreDelta !== 0) return scoreDelta
      return b.viewVelocity72h - a.viewVelocity72h
    })
}

async function searchBreakoutChannelsExternal(keyword: string, limit: number): Promise<VidiqBreakoutChannel[]> {
  const endpoint = process.env.VIDIQ_MCP_URL!
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      ...(process.env.VIDIQ_MCP_TOKEN ? { Authorization: `Bearer ${process.env.VIDIQ_MCP_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: {
        name: process.env.VIDIQ_MCP_TOOL ?? 'vidiq_breakout_channels',
        arguments: { query: keyword },
      },
    }),
  })
  if (!response.ok) return []
  const text = await response.text()
  const payload = parseVidiqSseResponse(text)
  if (!payload) return []
  return normalizeVidiqChannels(payload, keyword).slice(0, limit)
}

export async function searchVidiqBreakoutChannels({ keyword, limit = 10 }: VidiqSearchInput): Promise<VidiqBreakoutChannel[]> {
  if (process.env.VIDIQ_MCP_URL) {
    return searchBreakoutChannelsExternal(keyword, limit)
  }
  return searchBreakoutChannelsNative(keyword, limit)
}

export async function getVidiqChannelScore(channelId: string): Promise<number> {
  const stats = await getYouTubeChannelStats(channelId)
  if (!stats) return 0
  return computeOutlierScore(stats.avgViews, stats.views72h)
}
