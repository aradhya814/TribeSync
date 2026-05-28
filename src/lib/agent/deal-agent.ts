import { and, desc, eq, gte } from 'drizzle-orm'

import { callClaude } from '@/lib/claude'
import { db } from '@/lib/db'
import {
  agentRuns,
  agentSteps,
  campaigns,
  marketRateDefaults,
  outreachLogs,
  profiles,
  type JsonRecord,
} from '@/lib/db/schema'
import { sendGmail } from '@/lib/gmail'
import { pusherServer } from '@/lib/pusher'

type RankedCreator = {
  id: string
  fullName: string
  email: string
  avgViews: number
  viewSubscriberRatio: string | null
  enrichedContentStyle: string | null
  deliveryReliabilityScore: string | null
  fitReason: string
  rateMedian: string | null
  rateP25: string | null
  rateP75: string | null
}

type RankingResponse = {
  ranked_ids: string[]
  reasons: Record<string, string>
}

type OutreachDraft = {
  subject: string
  message: string
}

function formatInr(amount: string | null) {
  return Number(amount ?? 0).toLocaleString('en-IN')
}

function audienceBand(avgViews: number | null) {
  const views = avgViews ?? 0
  if (views < 10000) return 'nano'
  if (views < 100000) return 'micro'
  return 'mid'
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export class DealOriginationAgent {
  constructor(
    private readonly runId: string,
    private readonly campaignId: string,
    private readonly userId: string,
  ) {}

  private async logStep(
    stepKey: string,
    label: string,
    detail: string,
    status: string,
    outputData: JsonRecord = {},
  ) {
    const [row] = await db
      .insert(agentSteps)
      .values({
        runId: this.runId,
        stepKey,
        label,
        detail,
        status,
        outputData,
        completedAt: status === 'completed' || status === 'failed' ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [agentSteps.runId, agentSteps.stepKey],
        set: {
          label,
          detail,
          status,
          outputData,
          completedAt: status === 'completed' || status === 'failed' ? new Date() : null,
        },
      })
      .returning()

    await pusherServer.trigger(`private-agent-${this.runId}`, 'step-update', { step: row })
    return row
  }

  private async finishRun(status: 'waiting_human' | 'completed' | 'failed' | 'paused', summary: string) {
    const [run] = await db
      .update(agentRuns)
      .set({
        status,
        summary,
        completedAt: status === 'waiting_human' ? null : new Date(),
      })
      .where(eq(agentRuns.id, this.runId))
      .returning()

    await pusherServer.trigger(`private-agent-${this.runId}`, 'run-complete', { run })
  }

  async run() {
    try {
      await db.update(agentRuns).set({ status: 'running', startedAt: new Date() }).where(eq(agentRuns.id, this.runId))

      const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, this.campaignId)).limit(1)
      if (!campaign) throw new Error('Campaign not found')

      await this.logStep(
        'analyse_brief',
        'Analysed brief',
        `${campaign.goal ?? campaign.title} | ${campaign.niche ?? 'general'} | Rs ${formatInr(campaign.budget)}`,
        'completed',
      )

      const creators = await db
        .select({
          id: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email,
          niche: profiles.niche,
          avgViews: profiles.avgViews,
          viewSubscriberRatio: profiles.viewSubscriberRatio,
          deliveryReliabilityScore: profiles.deliveryReliabilityScore,
          enrichedContentStyle: profiles.enrichedContentStyle,
          enrichedSummary: profiles.enrichedSummary,
        })
        .from(profiles)
        .where(
          and(
            eq(profiles.status, 'active'),
            campaign.niche ? eq(profiles.niche, campaign.niche) : undefined,
            gte(profiles.avgViews, campaign.minAvgViews ?? 0),
          ),
        )
        .orderBy(desc(profiles.avgViews))
        .limit(50)

      await this.logStep('search_creators', 'Found creators', `${creators.length} matching creators found`, 'completed')

      const fallbackRanking: RankingResponse = {
        ranked_ids: creators.map((creator) => creator.id),
        reasons: Object.fromEntries(
          creators.map((creator) => [creator.id, `Strong avg views: ${(creator.avgViews ?? 0).toLocaleString('en-IN')}`]),
        ),
      }

      let ranking = fallbackRanking
      try {
        const response = await callClaude(
          `Rank these creators for the campaign. Return JSON { "ranked_ids": string[], "reasons": Record<string,string> }.
Campaign: ${JSON.stringify(campaign)}
Creators: ${JSON.stringify(creators)}`,
          { model: 'sonnet', maxTokens: 1200 },
        )
        ranking = parseJson(response, fallbackRanking)
      } catch {
        ranking = fallbackRanking
      }

      const creatorMap = new Map(creators.map((creator) => [creator.id, creator]))
      const topCreators = ranking.ranked_ids
        .map((id) => creatorMap.get(id))
        .filter((creator): creator is NonNullable<typeof creator> => Boolean(creator))
        .slice(0, 5)

      await this.logStep(
        'rank_creators',
        'Ranked creators',
        topCreators
          .slice(0, 3)
          .map((creator) => `${creator.fullName ?? creator.email}: ${ranking.reasons[creator.id] ?? 'high fit'}`)
          .join(' | '),
        'completed',
      )

      const defaults = await db.select().from(marketRateDefaults)
      const top5: RankedCreator[] = topCreators.map((creator) => {
        const rate = defaults.find(
          (item) => item.niche === creator.niche && item.audienceBand === audienceBand(creator.avgViews),
        )

        return {
          id: creator.id,
          fullName: creator.fullName ?? creator.email,
          email: creator.email,
          avgViews: creator.avgViews ?? 0,
          viewSubscriberRatio: creator.viewSubscriberRatio,
          enrichedContentStyle: creator.enrichedContentStyle,
          deliveryReliabilityScore: creator.deliveryReliabilityScore,
          fitReason: ranking.reasons[creator.id] ?? 'High fit',
          rateMedian: rate?.rateMedian ?? null,
          rateP25: rate?.rateP25 ?? null,
          rateP75: rate?.rateP75 ?? null,
        }
      })

      await this.logStep('market_rate_context', 'Added market rate context', `Rate context added for ${top5.length} creators`, 'completed')

      const topRankedCreator = top5[0]
      if (!topRankedCreator) throw new Error('No ranked creators available')

      const fallbackDraft: OutreachDraft = {
        subject: `${campaign.title} collaboration`,
        message: `Hi ${topRankedCreator.fullName}, we are planning ${campaign.title} with a budget of Rs ${formatInr(campaign.budget)}. Your content looks like a strong fit. Are you open to discussing this collaboration?`,
      }

      let draft = fallbackDraft
      try {
        const response = await callClaude(
          `Draft JSON { "subject": string, "message": string } under 120 words.
Creator style: ${topRankedCreator.enrichedContentStyle ?? 'general'}
Campaign goal: ${campaign.goal ?? campaign.title}
Budget: Rs ${formatInr(campaign.budget)}
CTA: reply if interested.`,
          { model: 'haiku', maxTokens: 500 },
        )
        draft = parseJson(response, fallbackDraft)
      } catch {
        draft = fallbackDraft
      }

      await this.logStep('draft_outreach', 'Drafted outreach', draft.subject, 'completed')

      const emailProvider = await sendGmail(topRankedCreator.email, draft.subject, draft.message)

      const followUpDueAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
      await db.insert(outreachLogs).values({
        senderId: this.userId,
        recipientId: topRankedCreator.id,
        recipientEmail: topRankedCreator.email,
        campaignId: campaign.id,
        subject: draft.subject,
        message: draft.message,
        followUpDueAt,
      })

      await this.logStep(
        'send_outreach',
        'Sent outreach',
        `Email sent to ${topRankedCreator.fullName} via ${emailProvider}`,
        'completed',
      )

      await this.logStep(
        'schedule_followup',
        'Scheduled follow-up',
        `Auto follow-up scheduled if no reply by ${followUpDueAt.toLocaleString('en-IN')}`,
        'completed',
      )

      await db.update(agentRuns).set({ status: 'waiting_human' }).where(eq(agentRuns.id, this.runId))
      await this.logStep('await_human', 'Awaiting your decision', 'Select a creator to initiate the deal', 'waiting_human', {
        top5,
      })
      await this.finishRun('waiting_human', 'Awaiting creator selection')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown agent failure'
      await this.logStep('agent_failed', 'Agent failed', message, 'failed')
      await this.finishRun('failed', message)
    }
  }
}
