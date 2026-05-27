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

function normalizeVidiqChannels(payload: unknown, keyword: string): VidiqBreakoutChannel[] {
  const root = asRecord(payload)
  const result = asRecord(root?.result)
  const rootChannels = root?.channels
  const rootResults = root?.results
  const resultChannels = result?.channels
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(rootChannels)
      ? rootChannels
      : Array.isArray(rootResults)
        ? rootResults
        : Array.isArray(resultChannels)
          ? resultChannels
          : []

  return candidates
    .map((candidate): VidiqBreakoutChannel | null => {
      const record = asRecord(candidate)
      if (!record) return null

      const channelId = pickString(record, ['channelId', 'channel_id', 'youtubeChannelId', 'id'])
      if (!channelId) return null

      return {
        channelId,
        title: pickString(record, ['title', 'channelTitle', 'name']) || 'YouTube creator',
        description: pickString(record, ['description', 'summary']),
        thumbnailUrl: pickString(record, ['thumbnailUrl', 'thumbnail_url', 'avatarUrl']) || null,
        channelUrl: pickString(record, ['channelUrl', 'url']),
        outlierScore: pickNumber(record, ['outlierScore', 'outlier_score', 'score']),
        viewVelocity72h: pickNumber(record, ['viewVelocity72h', 'view_velocity_72h', 'viewVelocity', 'views72h']),
        nicheKeyword: keyword,
      }
    })
    .filter((channel): channel is VidiqBreakoutChannel => Boolean(channel))
    .sort((a, b) => {
      const scoreDelta = b.outlierScore - a.outlierScore
      if (scoreDelta !== 0) return scoreDelta
      return b.viewVelocity72h - a.viewVelocity72h
    })
}

export async function searchVidiqBreakoutChannels({ keyword, limit = 10 }: VidiqSearchInput) {
  const endpoint = process.env.VIDIQ_MCP_URL
  if (!endpoint) return []

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.VIDIQ_MCP_TOKEN ? { Authorization: `Bearer ${process.env.VIDIQ_MCP_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: {
        name: process.env.VIDIQ_MCP_TOOL ?? 'search_breakout_channels',
        arguments: {
          keyword,
          niche: keyword,
          limit,
          sortBy: ['outlier_score', 'view_velocity'],
        },
      },
    }),
  })

  if (!response.ok) return []

  const payload = await response.json() as unknown
  const channels = normalizeVidiqChannels(payload, keyword)
  return channels.slice(0, limit)
}
