import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { campaigns, collabDeals, marketRateDefaults, profiles, traceabilityPacks } from '@/lib/db/schema'

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(date: Date) {
  return date.toLocaleString('en-IN', { month: 'short' })
}

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const userId = authResult.session.user.id
  let deals = await db.select().from(collabDeals).where(eq(collabDeals.msmeId, userId))
  let brandCampaigns = await db.select().from(campaigns).where(eq(campaigns.createdBy, userId))
  const creators = await db.select().from(profiles)
  let traceability = await db
    .select({
      campaignId: traceabilityPacks.campaignId,
      utmCampaign: traceabilityPacks.utmCampaign,
      couponCode: traceabilityPacks.couponCode,
    })
    .from(traceabilityPacks)
    .innerJoin(campaigns, eq(campaigns.id, traceabilityPacks.campaignId))
    .where(eq(campaigns.createdBy, userId))
  const marketRates = await db.select().from(marketRateDefaults).limit(10)

  if (deals.length === 0 && brandCampaigns.length === 0) {
    ;[deals, brandCampaigns, traceability] = await Promise.all([
      db.select().from(collabDeals).limit(10),
      db.select().from(campaigns).limit(10),
      db
        .select({
          campaignId: traceabilityPacks.campaignId,
          utmCampaign: traceabilityPacks.utmCampaign,
          couponCode: traceabilityPacks.couponCode,
        })
        .from(traceabilityPacks)
        .limit(10),
    ])
  }

  const monthlySpend = Array.from({ length: 12 }, (_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (11 - index))
    return { key: monthKey(date), month: monthLabel(date), spend: 0 }
  })

  for (const deal of deals) {
    const item = monthlySpend.find((month) => month.key === monthKey(new Date(deal.createdAt)))
    if (item) item.spend += Number(deal.agreedAmount)
  }

  const campaignRows = brandCampaigns.map((campaign) => {
    const campaignDeals = deals.filter((deal) => deal.campaignId === campaign.id)
    const spend = campaignDeals.reduce((sum, deal) => sum + Number(deal.agreedAmount), 0)
    const completed = campaignDeals.filter((deal) => deal.status === 'completed' || deal.status === 'invoiced' || deal.status === 'paid').length
    const pack = traceability.find((item) => item.campaignId === campaign.id)

    return {
      id: campaign.id,
      title: campaign.title,
      spend,
      deals: campaignDeals.length,
      roi: campaignDeals.length ? Math.round((completed / campaignDeals.length) * 100) : 0,
      utmCampaign: pack?.utmCampaign ?? null,
      couponCode: pack?.couponCode ?? null,
    }
  })

  const creatorRows = deals
    .map((deal) => {
      const creator = creators.find((profile) => profile.id === deal.creatorId)
      return {
        id: creator?.id ?? deal.id,
        name: creator?.fullName ?? creator?.email ?? 'Creator',
        avgViews: creator?.avgViews ?? 0,
        deals: deals.filter((item) => item.creatorId === deal.creatorId).length,
        spend: deals
          .filter((item) => item.creatorId === deal.creatorId)
          .reduce((sum, item) => sum + Number(item.agreedAmount), 0),
      }
    })
    .filter((row, index, rows) => rows.findIndex((item) => item.id === row.id) === index)

  return NextResponse.json({
    monthlySpend: monthlySpend.map(({ month, spend }) => ({ month, spend })),
    campaignRows,
    creatorRows,
    marketRates,
  })
}
