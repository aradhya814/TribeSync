import { and, eq, gte, inArray, isNotNull, lt, lte, ne } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { NextResponse } from 'next/server'

import { requireCron } from '@/lib/api/auth-check'
import { verifyProof } from '@/lib/api/proof'
import { db } from '@/lib/db'
import { adminNotifications, collabDeals, milestones, profiles } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email'
import { pusherServer } from '@/lib/pusher'

const creatorProfile = alias(profiles, 'cron_milestone_creator_profile')
const brandProfile = alias(profiles, 'cron_milestone_brand_profile')

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  const cronError = requireCron(request)
  if (cronError) return cronError

  const today = toDateString(new Date())
  const dueSoonLimit = toDateString(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))

  const dueSoon = await db
    .select({
      milestone: milestones,
      deal: collabDeals,
      creatorEmail: creatorProfile.email,
    })
    .from(milestones)
    .innerJoin(collabDeals, eq(collabDeals.id, milestones.dealId))
    .leftJoin(creatorProfile, eq(creatorProfile.id, collabDeals.creatorId))
    .where(
      and(
        isNotNull(milestones.dueDate),
        gte(milestones.dueDate, today),
        lte(milestones.dueDate, dueSoonLimit),
        inArray(milestones.status, ['pending', 'in_progress']),
      ),
    )

  for (const item of dueSoon) {
    if (item.creatorEmail) {
      await sendEmail({
        to: item.creatorEmail,
        template: 'milestone_due_soon',
        data: {
          milestone: item.milestone.title,
          dueDate: item.milestone.dueDate,
          dealId: item.deal.id,
        },
      })
    }
  }

  const overdue = await db
    .select({
      milestone: milestones,
      deal: collabDeals,
      creatorEmail: creatorProfile.email,
      brandEmail: brandProfile.email,
    })
    .from(milestones)
    .innerJoin(collabDeals, eq(collabDeals.id, milestones.dealId))
    .leftJoin(creatorProfile, eq(creatorProfile.id, collabDeals.creatorId))
    .leftJoin(brandProfile, eq(brandProfile.id, collabDeals.msmeId))
    .where(and(isNotNull(milestones.dueDate), lt(milestones.dueDate, today), ne(milestones.status, 'approved')))

  for (const item of overdue) {
    await db.insert(adminNotifications).values({
      type: 'milestone_overdue',
      title: 'Milestone overdue',
      body: `${item.milestone.title} is overdue on deal ${item.deal.id}.`,
      resourceType: 'deal',
      resourceId: item.deal.id,
    })

    if (item.deal.creatorId) {
      await pusherServer.trigger(`private-user-${item.deal.creatorId}`, 'milestone-overdue', {
        milestone: item.milestone,
      })
    }
    if (item.deal.msmeId) {
      await pusherServer.trigger(`private-user-${item.deal.msmeId}`, 'milestone-overdue', {
        milestone: item.milestone,
      })
    }

    if (item.creatorEmail) {
      await sendEmail({
        to: item.creatorEmail,
        template: 'milestone_due_soon',
        data: { milestone: item.milestone.title, overdue: true, dealId: item.deal.id },
      })
    }
    if (item.brandEmail) {
      await sendEmail({
        to: item.brandEmail,
        template: 'milestone_due_soon',
        data: { milestone: item.milestone.title, overdue: true, dealId: item.deal.id },
      })
    }
  }

  const submittedUnverified = await db
    .select()
    .from(milestones)
    .where(
      and(
        eq(milestones.status, 'completed'),
        eq(milestones.proofVerified, false),
        isNotNull(milestones.proofUrl),
      ),
    )

  let retriggeredVerifications = 0
  for (const milestone of submittedUnverified) {
    if (!milestone.proofUrl) continue
    retriggeredVerifications += 1
    void verifyProof(milestone.id, milestone.proofUrl, null).catch((error) => {
      console.error('Scheduled proof verification failed', error)
    })
  }

  return NextResponse.json({
    dueSoonReminders: dueSoon.length,
    overdueAlerts: overdue.length,
    retriggeredVerifications,
  })
}
