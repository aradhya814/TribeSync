import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { adminNotifications, campaigns, collabDeals, disputes, escrows, profiles, userRoles } from '@/lib/db/schema'

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function weekKey(date: Date) {
  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() - date.getDay())
  return dateKey(weekStart)
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function GET() {
  const authResult = await requireAdmin()
  if (authResult.error) return authResult.error

  const [deals, allEscrows, allDisputes, allProfiles, roles, allCampaigns, notifications] = await Promise.all([
    db.select().from(collabDeals),
    db.select().from(escrows),
    db.select().from(disputes).orderBy(desc(disputes.createdAt)),
    db.select().from(profiles),
    db.select().from(userRoles),
    db.select().from(campaigns),
    db.select().from(adminNotifications).where(eq(adminNotifications.isRead, false)),
  ])

  const today = dateKey(new Date())
  const currentMonth = monthKey(new Date())
  const gmvToday = deals
    .filter((deal) => dateKey(new Date(deal.createdAt)) === today)
    .reduce((sum, deal) => sum + Number(deal.agreedAmount), 0)
  const revenueMtd = deals
    .filter((deal) => deal.status === 'paid' && monthKey(new Date(deal.createdAt)) === currentMonth)
    .reduce((sum, deal) => sum + Number(deal.platformFee ?? 0), 0)
  const escrowLocked = allEscrows
    .filter((escrow) => escrow.status === 'funded' || escrow.status === 'partial_release' || escrow.status === 'disputed')
    .reduce((sum, escrow) => sum + Math.max(0, Number(escrow.totalAmount) - Number(escrow.releasedAmount ?? 0)), 0)
  const openDisputes = allDisputes.filter((dispute) => dispute.status === 'open' || dispute.status === 'under_review')

  const gmvDaily = Array.from({ length: 30 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - index))
    return { date: dateKey(date), gmv: 0 }
  })
  for (const deal of deals) {
    const item = gmvDaily.find((row) => row.date === dateKey(new Date(deal.createdAt)))
    if (item) item.gmv += Number(deal.agreedAmount)
  }

  const userGrowth = Array.from({ length: 8 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (7 - index) * 7)
    return { week: weekKey(date), creators: 0, msmes: 0 }
  })
  for (const profile of allProfiles) {
    const role = roles.find((item) => item.userId === profile.id)?.role
    const item = userGrowth.find((row) => row.week === weekKey(new Date(profile.createdAt)))
    if (!item) continue
    if (role === 'creator') item.creators += 1
    if (role === 'msme') item.msmes += 1
  }

  const topCreators = allProfiles
    .filter((profile) => roles.find((role) => role.userId === profile.id)?.role === 'creator')
    .map((profile) => {
      const creatorDeals = deals.filter((deal) => deal.creatorId === profile.id)
      return {
        id: profile.id,
        name: profile.fullName ?? profile.email,
        gmv: creatorDeals.reduce((sum, deal) => sum + Number(deal.agreedAmount), 0),
        deals: creatorDeals.length,
      }
    })
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 10)

  const disputesQueue = openDisputes.map((dispute) => ({
    id: dispute.id,
    type: dispute.disputeType,
    daysOld: Math.max(0, Math.floor((Date.now() - new Date(dispute.createdAt).getTime()) / (24 * 60 * 60 * 1000))),
    description: dispute.description,
  }))

  const pendingActions = {
    campaignsPendingReview: allCampaigns.filter((campaign) => campaign.status === 'pending_review').length,
    disputesOver48h: openDisputes.filter((dispute) => Date.now() - new Date(dispute.createdAt).getTime() > 48 * 60 * 60 * 1000).length,
    paymentMismatches: notifications.filter((notification) => notification.type === 'payment_amount_mismatch').length,
  }

  return NextResponse.json({
    stats: {
      gmvToday,
      revenueMtd,
      activeDeals: deals.filter((deal) => deal.status === 'active').length,
      escrowLocked,
      disputeRate: deals.length > 0 ? Math.round((allDisputes.length / deals.length) * 100) : 0,
    },
    gmvDaily,
    userGrowth,
    topCreators,
    disputesQueue,
    pendingActions,
  })
}
