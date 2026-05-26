import { and, eq } from 'drizzle-orm'
import { google } from 'googleapis'

import { callClaude } from '@/lib/claude'
import { db } from '@/lib/db'
import { campaigns, collabDeals, milestones, type JsonRecord } from '@/lib/db/schema'

type ProofVerificationResult = {
  confidence: number
  reason: string
  requiresManualReview?: boolean
}

function extractYouTubeVideoId(url: string) {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}

function isInstagramUrl(url: string) {
  return /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\//.test(url)
}

function parseConfidence(raw: string): ProofVerificationResult {
  try {
    const parsed = JSON.parse(raw) as Partial<ProofVerificationResult>
    return {
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence ?? 0))),
      reason: parsed.reason ?? 'AI reviewed the proof.',
    }
  } catch {
    return {
      confidence: 50,
      reason: raw.slice(0, 300),
    }
  }
}

export async function verifyProof(milestoneId: string, proofUrl: string, oldProofUrl?: string | null) {
  if (proofUrl === oldProofUrl) {
    return { confidence: 100, reason: 'Proof URL unchanged.' }
  }

  const [context] = await db
    .select({
      milestoneTitle: milestones.title,
      milestoneDescription: milestones.description,
      dealCreatedAt: collabDeals.createdAt,
      campaignGoal: campaigns.goal,
      campaignTitle: campaigns.title,
    })
    .from(milestones)
    .innerJoin(collabDeals, eq(collabDeals.id, milestones.dealId))
    .innerJoin(campaigns, eq(campaigns.id, collabDeals.campaignId))
    .where(and(eq(milestones.id, milestoneId)))
    .limit(1)

  if (!context) {
    throw new Error('Milestone not found')
  }

  const youtubeVideoId = extractYouTubeVideoId(proofUrl)

  if (youtubeVideoId) {
    try {
      const youtube = google.youtube({
        version: 'v3',
        auth: process.env.YOUTUBE_API_KEY,
      })

      const response = await youtube.videos.list({
        id: [youtubeVideoId],
        part: ['snippet', 'status'],
      })

      const video = response.data.items?.[0]
      const publishedAt = video?.snippet?.publishedAt ? new Date(video.snippet.publishedAt) : null
      const dealCreatedAt = new Date(context.dealCreatedAt)
      const isPublic = video?.status?.privacyStatus === 'public'
      const publishedAfterDeal = Boolean(publishedAt && publishedAt >= dealCreatedAt)

      const aiResponse = await callClaude(
        `Return JSON { "confidence": number, "reason": string }.
Campaign: ${context.campaignTitle}
Goal: ${context.campaignGoal ?? ''}
Milestone: ${context.milestoneTitle}
Milestone details: ${context.milestoneDescription ?? ''}
YouTube title: ${video?.snippet?.title ?? ''}
YouTube description: ${video?.snippet?.description ?? ''}`,
        { model: 'haiku', maxTokens: 300 },
      )
      const aiResult = parseConfidence(aiResponse)
      const verified = isPublic && publishedAfterDeal && aiResult.confidence >= 70
      const metadata: JsonRecord = {
        youtubeVideoId,
        isPublic,
        publishedAt: publishedAt?.toISOString(),
        publishedAfterDeal,
        aiConfidence: aiResult.confidence,
        aiReason: aiResult.reason,
      }

      await db
        .update(milestones)
        .set({
          proofUrl,
          proofPlatform: 'youtube',
          proofMetadata: metadata,
          proofVerified: verified,
          proofVerifiedAt: verified ? new Date() : null,
          proofVerificationError: verified ? null : aiResult.reason,
        })
        .where(eq(milestones.id, milestoneId))

      return aiResult
    } catch (error) {
      const message = error instanceof Error ? error.message : 'YouTube verification failed'
      await db
        .update(milestones)
        .set({
          proofUrl,
          proofPlatform: 'youtube',
          proofMetadata: { youtubeVideoId },
          proofVerified: false,
          proofVerificationError: message,
        })
        .where(eq(milestones.id, milestoneId))

      return { confidence: 0, reason: message, requiresManualReview: true }
    }
  }

  if (isInstagramUrl(proofUrl)) {
    const metadata: JsonRecord = {
      requiresManualReview: true,
      reason: 'Instagram proof URL format is valid, but platform verification requires manual review.',
    }

    await db
      .update(milestones)
      .set({
        proofUrl,
        proofPlatform: 'instagram',
        proofMetadata: metadata,
        proofVerified: false,
        proofVerificationError: metadata.reason as string,
      })
      .where(eq(milestones.id, milestoneId))

    return {
      confidence: 40,
      reason: metadata.reason as string,
      requiresManualReview: true,
    }
  }

  await db
    .update(milestones)
    .set({
      proofUrl,
      proofMetadata: { requiresManualReview: true, reason: 'Unsupported proof URL.' },
      proofVerified: false,
      proofVerificationError: 'Unsupported proof URL.',
    })
    .where(eq(milestones.id, milestoneId))

  return { confidence: 0, reason: 'Unsupported proof URL.', requiresManualReview: true }
}
