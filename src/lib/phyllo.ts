import { createHmac, timingSafeEqual } from 'crypto'

import { eq, or } from 'drizzle-orm'

import { calculateSponsorshipReadiness } from '@/lib/api/profiles'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'

type PhylloTokenResponse = {
  phylloUserId: string
  sdkToken: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}

function pickString(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return ''
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) return value
  }

  return ''
}

function pickNumber(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return 0
  for (const key of keys) {
    const value = record[key]
    const parsed = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(parsed)) return parsed
  }

  return 0
}

function phylloAuthHeader() {
  const clientId = process.env.PHYLLO_CLIENT_ID
  const secret = process.env.PHYLLO_CLIENT_SECRET
  if (!clientId || !secret) {
    throw new Error('PHYLLO_CLIENT_ID and PHYLLO_CLIENT_SECRET are required')
  }

  return `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`
}

async function phylloRequest(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${process.env.PHYLLO_BASE_URL ?? 'https://api.getphyllo.com'}${path}`, {
    method: 'POST',
    headers: {
      Authorization: phylloAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Phyllo request failed with status ${response.status}`)
  }

  return response.json() as Promise<unknown>
}

export async function createPhylloConnectToken(profile: { id: string; fullName: string | null; phylloUserId?: string | null }): Promise<PhylloTokenResponse> {
  const phylloUserId = profile.phylloUserId || pickString(
    asRecord(await phylloRequest('/v1/users', {
      name: profile.fullName ?? 'TribeSync creator',
      external_id: profile.id,
    })),
    ['id', 'user_id'],
  )

  if (!phylloUserId) {
    throw new Error('Phyllo user was not created')
  }

  if (!profile.phylloUserId) {
    await db
      .update(profiles)
      .set({ phylloUserId, phylloStatus: 'created', updatedAt: new Date() })
      .where(eq(profiles.id, profile.id))
  }

  const tokenPayload = asRecord(await phylloRequest('/v1/sdk-tokens', {
    user_id: phylloUserId,
    products: ['IDENTITY', 'ENGAGEMENT', 'ENGAGEMENT.AUDIENCE'],
  }))
  const sdkToken = pickString(tokenPayload, ['sdk_token', 'token', 'id'])

  if (!sdkToken) {
    throw new Error('Phyllo SDK token was not returned')
  }

  return { phylloUserId, sdkToken }
}

export function verifyPhylloWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PHYLLO_WEBHOOK_SECRET
  if (!secret) return true
  if (!signature) return false

  const digest = createHmac('sha256', secret).update(rawBody).digest('hex')
  const expected = Buffer.from(digest)
  const received = Buffer.from(signature.replace(/^sha256=/, ''))

  return expected.length === received.length && timingSafeEqual(expected, received)
}

export async function syncPhylloWebhook(payload: unknown) {
  const root = asRecord(payload)
  const data = asRecord(root?.data) ?? root
  const user = asRecord(data?.user)
  const account = asRecord(data?.account) ?? data
  const metrics = asRecord(data?.metrics) ?? asRecord(data?.engagement) ?? data

  const externalId = pickString(user, ['external_id', 'externalId']) || pickString(data, ['external_id', 'externalId'])
  const phylloUserId = pickString(user, ['id', 'user_id']) || pickString(data, ['user_id', 'userId'])
  const accountId = pickString(account, ['id', 'account_id', 'accountId'])
  const verifiedAvgViews = pickNumber(metrics, ['verified_avg_views', 'average_views', 'avg_views', 'avgViews'])
  const views72h = pickNumber(metrics, ['views_72h', 'views72h', 'view_velocity_72h'])

  if (!externalId && !phylloUserId) {
    return null
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(or(eq(profiles.id, externalId), eq(profiles.phylloUserId, phylloUserId)))
    .limit(1)

  if (!profile) return null

  const nextProfile = {
    ...profile,
    avgViews: verifiedAvgViews || profile.avgViews,
    views72h: views72h || profile.views72h,
    contentPurity: profile.contentPurity ?? 'pure',
    isVerified: true,
  }
  const sponsorshipReadiness = calculateSponsorshipReadiness(nextProfile)

  const [updated] = await db
    .update(profiles)
    .set({
      verifiedAvgViews: verifiedAvgViews || profile.verifiedAvgViews,
      avgViews: verifiedAvgViews || profile.avgViews,
      views72h: views72h || profile.views72h,
      dataSource: 'phyllo_verified',
      trustMultiplier: '0.95',
      phylloUserId: phylloUserId || profile.phylloUserId,
      phylloAccountId: accountId || profile.phylloAccountId,
      phylloStatus: 'connected',
      isVerified: true,
      sponsorshipReadiness: sponsorshipReadiness.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, profile.id))
    .returning({ id: profiles.id })

  return updated
}
