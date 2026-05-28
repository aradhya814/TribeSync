import 'dotenv/config'

import bcrypt from 'bcryptjs'
import { and, eq, inArray, sql } from 'drizzle-orm'

import { calculateSponsorshipReadiness } from '@/lib/api/profiles'
import { db } from '@/lib/db'
import {
  adminNotifications,
  agentRuns,
  agentSteps,
  campaignApplications,
  campaigns,
  chronicleRunLog,
  collabDeals,
  competitorProfiles,
  creatorBankDetails,
  creatorPlatformAccounts,
  crmContacts,
  disputes,
  escrows,
  inboundBriefs,
  invoices,
  marketRateDefaults,
  milestones,
  notificationPrefs,
  outreachLogs,
  outreachSignals,
  playbooks,
  profiles,
  rankings,
  traceabilityPacks,
  tribesyncChronicles,
  userRoles,
  type AppRole,
  type JsonRecord,
  type PlaybookTactic,
} from '@/lib/db/schema'

type SeedProfile = {
  email: string
  fullName: string
  role: AppRole
  niche?: string
  platforms?: string[]
  subscribers?: number
  avgViews?: number
  views72h?: number
  contentLanguage?: string
  contentPurity?: 'pure' | 'regional' | 'mixed'
  secondaryNiche?: string
  contentMixRatio?: string
  sponsorshipReadiness?: string
  acceptsSponsorships?: boolean
  engagementRate?: string
  postingFrequency?: string
  enrichedSummary?: string
  enrichedTags?: string[]
  enrichedContentStyle?: string
  company?: string
  industry?: string
  website?: string
  publicSlug?: string
  isVerified?: boolean
  location?: string
  deliveryReliabilityScore?: string
  verifiedAvgViews?: number
  dataSource?: string
  trustMultiplier?: string
  vidiqOutlierScore?: string
  vidiqViewVelocity?: number
}

const passwordHashPromise = bcrypt.hash('password123', 12)

function withSponsorshipReadiness(profile: SeedProfile): SeedProfile {
  return {
    ...profile,
    sponsorshipReadiness: calculateSponsorshipReadiness(profile).toFixed(2),
  }
}

const creatorSeeds: SeedProfile[] = [
  {
    email: 'arjun.tech@example.com',
    fullName: 'Arjun Mehta',
    role: 'creator',
    niche: 'tech',
    platforms: ['youtube', 'instagram'],
    subscribers: 86000,
    avgViews: 52000,
    views72h: 95000,
    contentLanguage: 'en',
    contentPurity: 'pure',
    location: 'Bengaluru, Karnataka',
    acceptsSponsorships: true,
    engagementRate: '6.40',
    postingFrequency: 'weekly',
    enrichedSummary: 'Tech tutorial creator with strong laptop, gaming, and productivity audiences.',
    enrichedTags: ['gaming laptops', 'tutorials', 'reviews'],
    enrichedContentStyle: 'tutorial',
    publicSlug: 'arjun-mehta',
    isVerified: true,
    deliveryReliabilityScore: '94.00',
    verifiedAvgViews: 52000,
    dataSource: 'phyllo_verified',
    trustMultiplier: '0.95',
    vidiqOutlierScore: '78.50',
    vidiqViewVelocity: 18400,
  },
  {
    email: 'riya.fashion@example.com',
    fullName: 'Riya Kapoor',
    role: 'creator',
    niche: 'fashion',
    platforms: ['instagram'],
    subscribers: 42000,
    avgViews: 27000,
    views72h: 48000,
    contentLanguage: 'hi',
    contentPurity: 'mixed',
    location: 'Mumbai, Maharashtra',
    secondaryNiche: 'lifestyle',
    contentMixRatio: '70/30',
    acceptsSponsorships: true,
    engagementRate: '7.10',
    postingFrequency: 'weekly',
    enrichedSummary: 'Fashion creator focused on affordable styling and festive looks.',
    enrichedTags: ['styling', 'festive', 'reels'],
    enrichedContentStyle: 'storytelling',
    publicSlug: 'riya-kapoor',
    isVerified: true,
    deliveryReliabilityScore: '91.00',
    verifiedAvgViews: 27000,
    dataSource: 'phyllo_verified',
    trustMultiplier: '0.92',
    vidiqOutlierScore: '64.10',
    vidiqViewVelocity: 9800,
  },
  {
    email: 'kabir.food@example.com',
    fullName: 'Kabir Rao',
    role: 'creator',
    niche: 'food',
    platforms: ['youtube', 'instagram'],
    subscribers: 135000,
    avgViews: 118000,
    views72h: 120000,
    contentLanguage: 'ta',
    contentPurity: 'regional',
    location: 'Chennai, Tamil Nadu',
    acceptsSponsorships: true,
    engagementRate: '5.80',
    postingFrequency: 'weekly',
    enrichedSummary: 'Food creator covering quick recipes, restaurant finds, and kitchen products.',
    enrichedTags: ['recipes', 'restaurants', 'kitchen'],
    enrichedContentStyle: 'review',
    publicSlug: 'kabir-rao',
    isVerified: true,
    deliveryReliabilityScore: '88.00',
    verifiedAvgViews: 118000,
    dataSource: 'phyllo_verified',
    trustMultiplier: '0.90',
    vidiqOutlierScore: '81.20',
    vidiqViewVelocity: 22100,
  },
  {
    email: 'naina.finance@example.com',
    fullName: 'Naina Shah',
    role: 'creator',
    niche: 'finance',
    platforms: ['youtube', 'linkedin'],
    subscribers: 74000,
    avgViews: 39000,
    views72h: 62000,
    contentLanguage: 'en',
    contentPurity: 'pure',
    location: 'Ahmedabad, Gujarat',
    acceptsSponsorships: true,
    engagementRate: '4.90',
    postingFrequency: 'weekly',
    enrichedSummary: 'Finance educator simplifying savings, tax, and small-business money decisions.',
    enrichedTags: ['personal finance', 'tax', 'msme'],
    enrichedContentStyle: 'tutorial',
    publicSlug: 'naina-shah',
    isVerified: true,
    deliveryReliabilityScore: '96.00',
    verifiedAvgViews: 39000,
    dataSource: 'phyllo_verified',
    trustMultiplier: '0.96',
    vidiqOutlierScore: '70.40',
    vidiqViewVelocity: 11700,
  },
  {
    email: 'dev.fitness@example.com',
    fullName: 'Dev Iyer',
    role: 'creator',
    niche: 'fitness',
    platforms: ['instagram', 'youtube'],
    subscribers: 21000,
    avgViews: 14000,
    views72h: 30000,
    contentLanguage: 'hi',
    contentPurity: 'pure',
    location: 'Pune, Maharashtra',
    acceptsSponsorships: true,
    engagementRate: '8.20',
    postingFrequency: 'biweekly',
    enrichedSummary: 'Fitness creator known for home workouts and beginner-friendly routines.',
    enrichedTags: ['home workouts', 'nutrition', 'beginners'],
    enrichedContentStyle: 'tutorial',
    publicSlug: 'dev-iyer',
    deliveryReliabilityScore: '86.00',
    verifiedAvgViews: 14000,
    dataSource: 'self_reported',
    trustMultiplier: '0.78',
    vidiqOutlierScore: '58.90',
    vidiqViewVelocity: 6400,
  },
  {
    email: 'meera.tech@example.com',
    fullName: 'Meera Nair',
    role: 'creator',
    niche: 'tech',
    platforms: ['instagram', 'linkedin'],
    subscribers: 18000,
    avgViews: 9000,
    views72h: 34000,
    contentLanguage: 'en',
    contentPurity: 'mixed',
    location: 'Kochi, Kerala',
    secondaryNiche: 'productivity',
    contentMixRatio: '80/20',
    acceptsSponsorships: true,
    engagementRate: '6.90',
    postingFrequency: 'weekly',
    enrichedSummary: 'Tech explainer focused on AI tools, apps, and workflow automation.',
    enrichedTags: ['ai tools', 'apps', 'automation'],
    enrichedContentStyle: 'review',
    publicSlug: 'meera-nair',
    deliveryReliabilityScore: '89.00',
    verifiedAvgViews: 9000,
    dataSource: 'vidiq_estimate',
    trustMultiplier: '0.84',
    vidiqOutlierScore: '73.60',
    vidiqViewVelocity: 7200,
  },
  {
    email: 'tara.food@example.com',
    fullName: 'Tara Singh',
    role: 'creator',
    niche: 'food',
    platforms: ['instagram'],
    subscribers: 26000,
    avgViews: 17000,
    views72h: 41000,
    contentLanguage: 'hi',
    contentPurity: 'regional',
    location: 'Jaipur, Rajasthan',
    acceptsSponsorships: true,
    engagementRate: '7.40',
    postingFrequency: 'biweekly',
    enrichedSummary: 'Home cooking creator with strong vegetarian and regional recipe engagement.',
    enrichedTags: ['vegetarian', 'regional', 'home cooking'],
    enrichedContentStyle: 'storytelling',
    publicSlug: 'tara-singh',
    deliveryReliabilityScore: '84.00',
    verifiedAvgViews: 17000,
    dataSource: 'self_reported',
    trustMultiplier: '0.76',
    vidiqOutlierScore: '61.30',
    vidiqViewVelocity: 5900,
  },
  {
    email: 'isha.fashion@example.com',
    fullName: 'Isha Malhotra',
    role: 'creator',
    niche: 'fashion',
    platforms: ['instagram', 'youtube'],
    subscribers: 98000,
    avgViews: 64000,
    views72h: 88000,
    contentLanguage: 'en',
    contentPurity: 'mixed',
    location: 'Delhi NCR',
    secondaryNiche: 'beauty',
    contentMixRatio: '65/35',
    acceptsSponsorships: true,
    engagementRate: '6.30',
    postingFrequency: 'weekly',
    enrichedSummary: 'Fashion and beauty creator with high-performing styling transitions.',
    enrichedTags: ['beauty', 'styling', 'transitions'],
    enrichedContentStyle: 'storytelling',
    publicSlug: 'isha-malhotra',
    isVerified: true,
    deliveryReliabilityScore: '93.00',
    verifiedAvgViews: 64000,
    dataSource: 'phyllo_verified',
    trustMultiplier: '0.94',
    vidiqOutlierScore: '76.80',
    vidiqViewVelocity: 15300,
  },
  {
    email: 'rohan.finance@example.com',
    fullName: 'Rohan Bansal',
    role: 'creator',
    niche: 'finance',
    platforms: ['youtube'],
    subscribers: 33000,
    avgViews: 21000,
    views72h: 36000,
    contentLanguage: 'en',
    contentPurity: 'pure',
    location: 'Gurugram, Haryana',
    acceptsSponsorships: true,
    engagementRate: '5.20',
    postingFrequency: 'weekly',
    enrichedSummary: 'Finance creator focused on investing basics and young earners.',
    enrichedTags: ['investing', 'basics', 'young earners'],
    enrichedContentStyle: 'tutorial',
    publicSlug: 'rohan-bansal',
    deliveryReliabilityScore: '87.00',
    verifiedAvgViews: 21000,
    dataSource: 'vidiq_estimate',
    trustMultiplier: '0.82',
    vidiqOutlierScore: '67.20',
    vidiqViewVelocity: 8100,
  },
  {
    email: 'anjali.fitness@example.com',
    fullName: 'Anjali Menon',
    role: 'creator',
    niche: 'fitness',
    platforms: ['instagram'],
    subscribers: 76000,
    avgViews: 59000,
    views72h: 78000,
    contentLanguage: 'ta',
    contentPurity: 'pure',
    location: 'Coimbatore, Tamil Nadu',
    acceptsSponsorships: true,
    engagementRate: '7.70',
    postingFrequency: 'weekly',
    enrichedSummary: 'Fitness creator with strong women-led wellness and strength content.',
    enrichedTags: ['strength', 'wellness', 'women'],
    enrichedContentStyle: 'tutorial',
    publicSlug: 'anjali-menon',
    isVerified: true,
    deliveryReliabilityScore: '95.00',
    verifiedAvgViews: 59000,
    dataSource: 'phyllo_verified',
    trustMultiplier: '0.95',
    vidiqOutlierScore: '74.90',
    vidiqViewVelocity: 14200,
  },
]

const creators = creatorSeeds.map(withSponsorshipReadiness)

const msmes: SeedProfile[] = [
  {
    email: 'brand.tech@example.com',
    fullName: 'NovaByte Electronics',
    role: 'msme',
    company: 'NovaByte Electronics',
    industry: 'Consumer electronics',
    website: 'https://example.com/novabyte',
  },
  {
    email: 'brand.food@example.com',
    fullName: 'Masala Street Foods',
    role: 'msme',
    company: 'Masala Street Foods',
    industry: 'Food and beverage',
    website: 'https://example.com/masala',
  },
  {
    email: 'brand.fitness@example.com',
    fullName: 'FlexFuel Nutrition',
    role: 'msme',
    company: 'FlexFuel Nutrition',
    industry: 'Health and wellness',
    website: 'https://example.com/flexfuel',
  },
]

const marketRates = [
  ['tech', 'nano', '8000', '15000', '25000'],
  ['tech', 'micro', '25000', '60000', '95000'],
  ['tech', 'mid', '90000', '140000', '220000'],
  ['fashion', 'nano', '6000', '12000', '22000'],
  ['fashion', 'micro', '18000', '45000', '85000'],
  ['fashion', 'mid', '75000', '125000', '200000'],
  ['food', 'nano', '5000', '11000', '20000'],
  ['food', 'micro', '18000', '40000', '75000'],
  ['food', 'mid', '70000', '120000', '190000'],
  ['finance', 'nano', '9000', '18000', '30000'],
  ['finance', 'micro', '30000', '70000', '120000'],
  ['finance', 'mid', '100000', '160000', '260000'],
  ['fitness', 'nano', '5000', '10000', '18000'],
  ['fitness', 'micro', '16000', '38000', '70000'],
  ['fitness', 'mid', '65000', '110000', '180000'],
  ['general', 'nano', '4000', '8000', '14000'],
  ['general', 'micro', '12000', '30000', '55000'],
  ['general', 'mid', '50000', '90000', '150000'],
] as const

async function ensureProfile(profile: SeedProfile, passwordHash: string) {
  const [existing] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, profile.email)).limit(1)

  if (existing) {
    await db
      .update(profiles)
      .set({
        fullName: profile.fullName,
        niche: profile.niche,
        platforms: profile.platforms,
        subscribers: profile.subscribers,
        avgViews: profile.avgViews,
        views72h: profile.views72h,
        contentLanguage: profile.contentLanguage,
        contentPurity: profile.contentPurity,
        secondaryNiche: profile.secondaryNiche,
        contentMixRatio: profile.contentMixRatio,
        sponsorshipReadiness: profile.sponsorshipReadiness,
        acceptsSponsorships: profile.acceptsSponsorships,
        engagementRate: profile.engagementRate,
        postingFrequency: profile.postingFrequency,
        enrichedSummary: profile.enrichedSummary,
        enrichedTags: profile.enrichedTags,
        enrichedContentStyle: profile.enrichedContentStyle,
        company: profile.company,
        industry: profile.industry,
        website: profile.website,
        publicSlug: profile.publicSlug,
        location: profile.location,
        deliveryReliabilityScore: profile.deliveryReliabilityScore,
        verifiedAvgViews: profile.verifiedAvgViews,
        dataSource: profile.dataSource,
        trustMultiplier: profile.trustMultiplier,
        vidiqOutlierScore: profile.vidiqOutlierScore,
        vidiqViewVelocity: profile.vidiqViewVelocity,
        isVerified: profile.isVerified ?? false,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, existing.id))

    await db
      .insert(userRoles)
      .values({ userId: existing.id, role: profile.role })
      .onConflictDoUpdate({ target: userRoles.userId, set: { role: profile.role } })
    await db.insert(notificationPrefs).values({ userId: existing.id }).onConflictDoNothing()

    return existing.id
  }

  const [created] = await db
    .insert(profiles)
    .values({
      email: profile.email,
      passwordHash,
      fullName: profile.fullName,
      niche: profile.niche,
      platforms: profile.platforms,
      subscribers: profile.subscribers,
      avgViews: profile.avgViews,
      views72h: profile.views72h,
      contentLanguage: profile.contentLanguage,
      contentPurity: profile.contentPurity,
      secondaryNiche: profile.secondaryNiche,
      contentMixRatio: profile.contentMixRatio,
      sponsorshipReadiness: profile.sponsorshipReadiness,
      acceptsSponsorships: profile.acceptsSponsorships,
      engagementRate: profile.engagementRate,
      postingFrequency: profile.postingFrequency,
      enrichedSummary: profile.enrichedSummary,
      enrichedTags: profile.enrichedTags,
      enrichedContentStyle: profile.enrichedContentStyle,
      company: profile.company,
      industry: profile.industry,
      website: profile.website,
      publicSlug: profile.publicSlug,
      location: profile.location,
      deliveryReliabilityScore: profile.deliveryReliabilityScore,
      verifiedAvgViews: profile.verifiedAvgViews,
      dataSource: profile.dataSource,
      trustMultiplier: profile.trustMultiplier,
      vidiqOutlierScore: profile.vidiqOutlierScore,
      vidiqViewVelocity: profile.vidiqViewVelocity,
      isVerified: profile.isVerified ?? false,
      status: 'active',
    })
    .returning({ id: profiles.id })

  await db.insert(userRoles).values({ userId: created.id, role: profile.role })
  await db.insert(notificationPrefs).values({ userId: created.id })

  return created.id
}

type CampaignSeed = typeof campaigns.$inferInsert
type DealTargetStatus = 'active' | 'completed' | 'invoiced' | 'paid' | 'disputed'

const now = new Date()

function daysFromNow(days: number) {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  return date
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function currentMonth() {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

async function ensureCampaign(seed: CampaignSeed) {
  const matches = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.createdBy, seed.createdBy), eq(campaigns.title, seed.title)))
  const [existing] = matches

  if (existing) {
    const duplicateIds = matches.slice(1).map((match) => match.id)
    if (duplicateIds.length > 0) {
      await db.delete(campaigns).where(inArray(campaigns.id, duplicateIds))
    }

    await db
      .update(campaigns)
      .set({
        description: seed.description,
        goal: seed.goal,
        niche: seed.niche,
        budget: seed.budget,
        timelineStart: seed.timelineStart,
        timelineEnd: seed.timelineEnd,
        status: seed.status,
        priority: seed.priority,
        campaignType: seed.campaignType,
        targetCreatorId: seed.targetCreatorId,
        minAvgViews: seed.minAvgViews,
        minSubscribers: seed.minSubscribers,
        requiredPlatforms: seed.requiredPlatforms,
        requiredContentStyle: seed.requiredContentStyle,
        deliverables: seed.deliverables,
        maxApplicants: seed.maxApplicants,
        applicationDeadline: seed.applicationDeadline,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, existing.id))
    return existing.id
  }

  const [created] = await db.insert(campaigns).values(seed).returning({ id: campaigns.id })
  return created.id
}

async function ensureMilestone(dealId: string, title: string, values: Partial<typeof milestones.$inferInsert>) {
  const [existing] = await db
    .select({ id: milestones.id })
    .from(milestones)
    .where(and(eq(milestones.dealId, dealId), eq(milestones.title, title)))
    .limit(1)

  const payload = {
    dealId,
    title,
    ...values,
    updatedAt: new Date(),
  }

  if (existing) {
    await db.update(milestones).set(payload).where(eq(milestones.id, existing.id))
    return existing.id
  }

  const [created] = await db.insert(milestones).values(payload).returning({ id: milestones.id })
  return created.id
}

async function ensureEscrow(dealId: string, totalAmount: string, status: typeof escrows.$inferInsert.status) {
  const [existing] = await db.select({ id: escrows.id }).from(escrows).where(eq(escrows.dealId, dealId)).limit(1)
  const payload = {
    dealId,
    totalAmount,
    status,
    fundedAt: status === 'unfunded' ? null : daysFromNow(-18),
    paymentReference: status === 'unfunded' ? null : `rzp_demo_${dealId.slice(0, 8)}`,
    paymentGateway: status === 'unfunded' ? null : 'razorpay',
    releasedAmount: status === 'completed' ? totalAmount : '0',
    releasedAt: status === 'completed' ? daysFromNow(-4) : null,
    updatedAt: new Date(),
  }

  if (existing) {
    await db.update(escrows).set(payload).where(eq(escrows.id, existing.id))
    return existing.id
  }

  const [created] = await db.insert(escrows).values(payload).returning({ id: escrows.id })
  return created.id
}

async function transitionDeal(dealId: string, targetStatus: DealTargetStatus) {
  const order: DealTargetStatus[] = ['active', 'completed', 'invoiced', 'paid']
  const [deal] = await db.select({ status: collabDeals.status }).from(collabDeals).where(eq(collabDeals.id, dealId)).limit(1)
  if (!deal || deal.status === targetStatus || deal.status === 'paid') return

  if (targetStatus === 'disputed') {
    if (deal.status === 'initiated') {
      await db.update(collabDeals).set({ status: 'active', signedAt: daysFromNow(-20) }).where(eq(collabDeals.id, dealId))
    }
    const [activeDeal] = await db.select({ status: collabDeals.status }).from(collabDeals).where(eq(collabDeals.id, dealId)).limit(1)
    if (activeDeal?.status === 'active') {
      await db.update(collabDeals).set({ status: 'disputed' }).where(eq(collabDeals.id, dealId))
    }
    return
  }

  const [current] = await db.select({ status: collabDeals.status }).from(collabDeals).where(eq(collabDeals.id, dealId)).limit(1)
  if (!current) return

  const currentIndex = current.status === 'initiated' ? -1 : order.indexOf(current.status as DealTargetStatus)
  const targetIndex = order.indexOf(targetStatus)
  for (const status of order.slice(currentIndex + 1, targetIndex + 1)) {
    await db
      .update(collabDeals)
      .set({ status, signedAt: status === 'active' ? daysFromNow(-20) : undefined })
      .where(eq(collabDeals.id, dealId))
  }
}

async function ensureDeal(seed: {
  campaignId: string
  creatorId: string
  msmeId: string
  agreedAmount: string
  terms: string
  targetStatus: DealTargetStatus
  escrowStatus: typeof escrows.$inferInsert.status
  milestones: Array<{ title: string; status: typeof milestones.$inferInsert.status; dueInDays: number; proofUrl?: string }>
}) {
  const [existing] = await db
    .select({ id: collabDeals.id, status: collabDeals.status })
    .from(collabDeals)
    .where(and(eq(collabDeals.campaignId, seed.campaignId), eq(collabDeals.creatorId, seed.creatorId)))
    .limit(1)

  const dealId = existing
    ? existing.id
    : (
        await db
          .insert(collabDeals)
          .values({
            campaignId: seed.campaignId,
            creatorId: seed.creatorId,
            msmeId: seed.msmeId,
            agreedAmount: seed.agreedAmount,
            terms: seed.terms,
          })
          .returning({ id: collabDeals.id })
      )[0].id

  await db
    .update(collabDeals)
    .set({ agreedAmount: seed.agreedAmount, terms: seed.terms, updatedAt: new Date() })
    .where(and(eq(collabDeals.id, dealId), sql`${collabDeals.status} <> 'paid'`))

  await ensureEscrow(dealId, seed.agreedAmount, seed.escrowStatus)

  for (const item of seed.milestones) {
    const completed = item.status === 'completed' || item.status === 'approved'
    await ensureMilestone(dealId, item.title, {
      description: `${item.title} for demo campaign.`,
      dueDate: isoDate(daysFromNow(item.dueInDays)),
      status: item.status,
      proofUrl: item.proofUrl,
      proofSubmittedAt: completed ? daysFromNow(-7) : undefined,
      proofVerified: item.status === 'approved',
      proofVerifiedAt: item.status === 'approved' ? daysFromNow(-5) : undefined,
      proofPlatform: item.proofUrl ? 'instagram' : undefined,
      proofMetadata: item.proofUrl ? ({ reach: 84200, clicks: 1940, saves: 712 } satisfies JsonRecord) : undefined,
      approvedAt: item.status === 'approved' ? daysFromNow(-4) : undefined,
      approvedBy: item.status === 'approved' ? seed.msmeId : undefined,
    })
  }

  await transitionDeal(dealId, seed.targetStatus)

  if (seed.targetStatus === 'paid') {
    await db
      .update(invoices)
      .set({ status: 'paid', paidAt: daysFromNow(-2), pdfUrl: 'https://example.com/demo-invoice.pdf' })
      .where(eq(invoices.dealId, dealId))
  }

  return dealId
}

async function ensureTraceabilityPack(seed: typeof traceabilityPacks.$inferInsert) {
  const [existing] = await db
    .select({ id: traceabilityPacks.id })
    .from(traceabilityPacks)
    .where(eq(traceabilityPacks.campaignId, seed.campaignId))
    .limit(1)

  if (existing) {
    await db.update(traceabilityPacks).set(seed).where(eq(traceabilityPacks.id, existing.id))
    return existing.id
  }

  const [created] = await db.insert(traceabilityPacks).values(seed).returning({ id: traceabilityPacks.id })
  return created.id
}

async function ensureDispute(seed: typeof disputes.$inferInsert) {
  if (!seed.dealId) return null
  const [existing] = await db
    .select({ id: disputes.id })
    .from(disputes)
    .where(and(eq(disputes.dealId, seed.dealId), eq(disputes.disputeType, seed.disputeType)))
    .limit(1)

  if (existing) {
    await db.update(disputes).set(seed).where(eq(disputes.id, existing.id))
    return existing.id
  }

  const [created] = await db.insert(disputes).values(seed).returning({ id: disputes.id })
  return created.id
}

async function ensureCrmContact(seed: typeof crmContacts.$inferInsert) {
  const [existing] = seed.creatorId
    ? await db
        .select({ id: crmContacts.id })
        .from(crmContacts)
        .where(and(eq(crmContacts.ownerId, seed.ownerId), eq(crmContacts.creatorId, seed.creatorId)))
        .limit(1)
    : []

  if (existing) {
    await db.update(crmContacts).set({ ...seed, updatedAt: new Date() }).where(eq(crmContacts.id, existing.id))
    return existing.id
  }

  const [created] = await db.insert(crmContacts).values(seed).returning({ id: crmContacts.id })
  return created.id
}

async function ensureOutreachSignal(seed: typeof outreachSignals.$inferInsert) {
  const [existing] = await db
    .select({ id: outreachSignals.id })
    .from(outreachSignals)
    .where(
      and(
        eq(outreachSignals.forUserId, seed.forUserId),
        eq(outreachSignals.creatorId, seed.creatorId),
        eq(outreachSignals.signalType, seed.signalType),
      ),
    )
    .limit(1)

  if (existing) {
    await db.update(outreachSignals).set(seed).where(eq(outreachSignals.id, existing.id))
    return existing.id
  }

  const [created] = await db.insert(outreachSignals).values(seed).returning({ id: outreachSignals.id })
  return created.id
}

async function ensureOutreachLog(seed: typeof outreachLogs.$inferInsert) {
  if (!seed.senderId || !seed.campaignId) return null
  const [existing] = await db
    .select({ id: outreachLogs.id })
    .from(outreachLogs)
    .where(and(eq(outreachLogs.senderId, seed.senderId), eq(outreachLogs.campaignId, seed.campaignId)))
    .limit(1)

  if (existing) {
    await db.update(outreachLogs).set(seed).where(eq(outreachLogs.id, existing.id))
    return existing.id
  }

  const [created] = await db.insert(outreachLogs).values(seed).returning({ id: outreachLogs.id })
  return created.id
}

async function ensureAgentRun(seed: typeof agentRuns.$inferInsert) {
  if (!seed.userId) return null
  const [existing] = await db
    .select({ id: agentRuns.id })
    .from(agentRuns)
    .where(
      and(
        eq(agentRuns.campaignId, seed.campaignId),
        eq(agentRuns.userId, seed.userId),
        eq(agentRuns.agentType, seed.agentType ?? 'deal_origination'),
      ),
    )
    .limit(1)

  if (existing) {
    await db.update(agentRuns).set(seed).where(eq(agentRuns.id, existing.id))
    return existing.id
  }

  const [created] = await db.insert(agentRuns).values(seed).returning({ id: agentRuns.id })
  return created.id
}

async function ensureInboundBrief(seed: typeof inboundBriefs.$inferInsert) {
  const [existing] = await db
    .select({ id: inboundBriefs.id })
    .from(inboundBriefs)
    .where(and(eq(inboundBriefs.creatorId, seed.creatorId), eq(inboundBriefs.brandName, seed.brandName)))
    .limit(1)

  if (existing) {
    await db.update(inboundBriefs).set(seed).where(eq(inboundBriefs.id, existing.id))
    return existing.id
  }

  const [created] = await db.insert(inboundBriefs).values(seed).returning({ id: inboundBriefs.id })
  return created.id
}

async function ensureAdminNotification(seed: typeof adminNotifications.$inferInsert) {
  if (!seed.resourceType || !seed.resourceId) return null
  const [existing] = await db
    .select({ id: adminNotifications.id })
    .from(adminNotifications)
    .where(
      and(
        eq(adminNotifications.type, seed.type),
        eq(adminNotifications.resourceType, seed.resourceType),
        eq(adminNotifications.resourceId, seed.resourceId),
      ),
    )
    .limit(1)

  if (existing) {
    await db.update(adminNotifications).set(seed).where(eq(adminNotifications.id, existing.id))
    return existing.id
  }

  const [created] = await db.insert(adminNotifications).values(seed).returning({ id: adminNotifications.id })
  return created.id
}

async function seedDemoGraph(adminId: string, creatorIds: string[], msmeIds: string[]) {
  const campaignIds = [
    await ensureCampaign({
      createdBy: msmeIds[0],
      title: 'Gaming laptop launch',
      description: 'Tech tutorial creators for a new performance laptop launch.',
      goal: 'Drive launch awareness and qualified traffic.',
      niche: 'tech',
      budget: '60000',
      timelineStart: isoDate(daysFromNow(-21)),
      timelineEnd: isoDate(daysFromNow(21)),
      status: 'live',
      priority: 'high',
      campaignType: 'targeted',
      targetCreatorId: creatorIds[0],
      minAvgViews: 8000,
      minSubscribers: 10000,
      requiredPlatforms: ['youtube'],
      requiredContentStyle: 'tutorial',
      deliverables: 'One YouTube tutorial and two Instagram story frames.',
      maxApplicants: 8,
      applicationDeadline: isoDate(daysFromNow(7)),
    }),
    await ensureCampaign({
      createdBy: msmeIds[1],
      title: 'Regional snack box launch',
      description: 'Food creators to showcase a new snack subscription box.',
      goal: 'Generate orders with coupon attribution.',
      niche: 'food',
      budget: '45000',
      timelineStart: isoDate(daysFromNow(-10)),
      timelineEnd: isoDate(daysFromNow(28)),
      status: 'live',
      priority: 'medium',
      campaignType: 'open',
      minAvgViews: 10000,
      requiredPlatforms: ['instagram'],
      requiredContentStyle: 'review',
      deliverables: 'One reel and one story set.',
      maxApplicants: 20,
      applicationDeadline: isoDate(daysFromNow(10)),
    }),
    await ensureCampaign({
      createdBy: msmeIds[2],
      title: 'Protein starter kit reels',
      description: 'Fitness creators for a beginner protein starter kit.',
      goal: 'Build trust and collect coupon-led sales signals.',
      niche: 'fitness',
      budget: '75000',
      timelineStart: isoDate(daysFromNow(3)),
      timelineEnd: isoDate(daysFromNow(35)),
      status: 'pending_review',
      priority: 'high',
      campaignType: 'open',
      minAvgViews: 12000,
      requiredPlatforms: ['instagram', 'youtube'],
      requiredContentStyle: 'tutorial',
      deliverables: 'Two reels, one short, and creator usage rights for 30 days.',
      maxApplicants: 12,
      applicationDeadline: isoDate(daysFromNow(14)),
    }),
  ]

  await Promise.all([
    ensureTraceabilityPack({
      campaignId: campaignIds[0],
      utmSource: 'youtube',
      utmMedium: 'creator',
      utmCampaign: 'novabyte-launch',
      shortlink: 'https://tribe.link/novabyte',
      couponCode: 'ARJUN15',
      referralCode: 'NB-ARJUN',
    }),
    ensureTraceabilityPack({
      campaignId: campaignIds[1],
      utmSource: 'instagram',
      utmMedium: 'creator',
      utmCampaign: 'masala-snack-box',
      shortlink: 'https://tribe.link/masala',
      couponCode: 'KABIR20',
      referralCode: 'MS-KABIR',
    }),
  ])

  await Promise.all([
    db.insert(campaignApplications).values({
      campaignId: campaignIds[1],
      creatorId: creatorIds[6],
      pitch: 'I can create a vegetarian snack box reel with a family tasting hook.',
      proposedRate: '22000',
      status: 'pending',
    }).onConflictDoNothing(),
    db.insert(campaignApplications).values({
      campaignId: campaignIds[2],
      creatorId: creatorIds[4],
      pitch: 'Beginner-friendly gym and home workout content with coupon CTA.',
      proposedRate: '28000',
      status: 'shortlisted',
      reviewedAt: daysFromNow(-1),
      reviewedBy: adminId,
    }).onConflictDoNothing(),
    db.insert(campaignApplications).values({
      campaignId: campaignIds[0],
      creatorId: creatorIds[5],
      pitch: 'AI workflow angle for creators and students.',
      proposedRate: '18000',
      status: 'accepted',
      reviewedAt: daysFromNow(-6),
      reviewedBy: adminId,
    }).onConflictDoNothing(),
  ])

  const paidDealId = await ensureDeal({
    campaignId: campaignIds[0],
    creatorId: creatorIds[0],
    msmeId: msmeIds[0],
    agreedAmount: '60000',
    terms: 'Creator will publish one YouTube tutorial and two story frames. Payment releases after proof approval.',
    targetStatus: 'paid',
    escrowStatus: 'completed',
    milestones: [
      { title: 'Concept and script approval', status: 'approved', dueInDays: -16, proofUrl: 'https://youtu.be/demo-script' },
      { title: 'YouTube tutorial live', status: 'approved', dueInDays: -7, proofUrl: 'https://youtu.be/demo-laptop' },
      { title: 'Instagram story frames', status: 'approved', dueInDays: -5, proofUrl: 'https://instagram.com/stories/demo' },
    ],
  })

  const activeDealId = await ensureDeal({
    campaignId: campaignIds[1],
    creatorId: creatorIds[2],
    msmeId: msmeIds[1],
    agreedAmount: '45000',
    terms: 'Creator will publish one food reel and one story set with coupon tracking.',
    targetStatus: 'active',
    escrowStatus: 'funded',
    milestones: [
      { title: 'Product tasting notes', status: 'approved', dueInDays: -2, proofUrl: 'https://docs.example.com/tasting-notes' },
      { title: 'Reel draft submission', status: 'in_progress', dueInDays: 3 },
      { title: 'Final reel and story set', status: 'pending', dueInDays: 9 },
    ],
  })

  const disputedDealId = await ensureDeal({
    campaignId: campaignIds[2],
    creatorId: creatorIds[9],
    msmeId: msmeIds[2],
    agreedAmount: '72000',
    terms: 'Creator will publish two fitness reels and one short with performance proof.',
    targetStatus: 'disputed',
    escrowStatus: 'disputed',
    milestones: [
      { title: 'Workout plan draft', status: 'approved', dueInDays: -12, proofUrl: 'https://docs.example.com/workout-plan' },
      { title: 'First reel live', status: 'rejected', dueInDays: -4, proofUrl: 'https://instagram.com/reel/demo-fitness' },
      { title: 'Short live', status: 'pending', dueInDays: 4 },
    ],
  })

  await ensureDispute({
    dealId: disputedDealId,
    raisedBy: msmeIds[2],
    disputeType: 'deliverable',
    description: 'First reel missed the required product placement and coupon CTA.',
    status: 'under_review',
  })

  for (let index = 0; index < creatorIds.length; index += 1) {
    const creatorId = creatorIds[index]
    if (!creatorId) continue
    const score = (95 - index * 4.15).toFixed(4)
    await db.insert(rankings).values({
      userId: creatorId,
      period: 'weekly',
      rankPosition: index + 1,
      niche: creators[index]?.niche,
      score,
    }).onConflictDoUpdate({
      target: [rankings.userId, rankings.period, rankings.niche],
      set: { rankPosition: index + 1, score, calculatedAt: new Date() },
    })
  }

  const playbookTactics: PlaybookTactic[] = [
    {
      title: 'Proof-first reel hook',
      description: 'Open with a measurable before/after result and disclose the product within the first 5 seconds.',
      difficulty: 'medium',
      expectedImpact: 'Higher saves and cleaner brand approval.',
      timeEstimate: '45 minutes',
      emoji: 'chart',
      proTips: ['Keep one coupon CTA on screen', 'Add a pinned comment with the traceability link'],
    },
  ]

  await db.insert(playbooks).values([
    { niche: 'tech', weekOf: isoDate(daysFromNow(-3)), tactics: playbookTactics },
    { niche: 'food', weekOf: isoDate(daysFromNow(-3)), tactics: playbookTactics },
    { niche: 'fitness', weekOf: isoDate(daysFromNow(-3)), tactics: playbookTactics },
  ]).onConflictDoNothing()

  await Promise.all([
    db.insert(tribesyncChronicles).values({
      userId: creatorIds[0],
      month: currentMonth(),
      title: 'Launch month momentum',
      metrics: { deals: 1, completedDeals: 1, earnings: 54000, avgViews: 52000 },
      insights: ['Laptop tutorial converted strongly from high-intent YouTube traffic.', 'Story frames drove the fastest coupon redemptions.'],
      isPublic: true,
    }).onConflictDoUpdate({
      target: [tribesyncChronicles.userId, tribesyncChronicles.month],
      set: {
        title: 'Launch month momentum',
        metrics: { deals: 1, completedDeals: 1, earnings: 54000, avgViews: 52000 },
        insights: ['Laptop tutorial converted strongly from high-intent YouTube traffic.', 'Story frames drove the fastest coupon redemptions.'],
        isPublic: true,
        generatedAt: new Date(),
        updatedAt: new Date(),
      },
    }),
    db.insert(chronicleRunLog).values({
      creatorId: creatorIds[0],
      month: currentMonth(),
      status: 'completed',
    }).onConflictDoUpdate({
      target: [chronicleRunLog.creatorId, chronicleRunLog.month],
      set: { status: 'completed', processedAt: new Date() },
    }),
  ])

  const runId = await ensureAgentRun({
    campaignId: campaignIds[1],
    userId: msmeIds[1],
    agentType: 'deal_origination',
    status: 'waiting_human',
    summary: '3 food creators ranked. Kabir Rao recommended for immediate outreach.',
    outputData: { recommendedCreatorIds: [creatorIds[2], creatorIds[6]], estimatedSpend: 67000 },
    startedAt: daysFromNow(-1),
  })

  if (runId) {
    await db.insert(agentSteps).values([
      {
        runId,
        stepKey: 'profile_search',
        label: 'Searched food creators',
        detail: 'Filtered by regional food content, avg views above 10k, and active sponsorship readiness.',
        status: 'completed',
        outputData: { matches: 4 },
        completedAt: daysFromNow(-1),
      },
      {
        runId,
        stepKey: 'rank_shortlist',
        label: 'Ranked shortlist',
        detail: 'Kabir has the strongest avg views and coupon-friendly content style.',
        status: 'completed',
        outputData: { topCreatorId: creatorIds[2] },
        completedAt: daysFromNow(-1),
      },
      {
        runId,
        stepKey: 'human_approval',
        label: 'Waiting for brand approval',
        detail: 'Approve outreach sequence before sending.',
        status: 'waiting_human',
        outputData: { nextAction: 'approve_outreach' },
      },
    ]).onConflictDoNothing()
  }

  await Promise.all([
    ensureOutreachSignal({
      forUserId: msmeIds[0],
      creatorId: creatorIds[5],
      signalType: 'rising_velocity',
      signalData: { views72h: 34000, reason: 'AI tools content is trending this week' },
      suggestedMessage: 'Loved your AI workflow reel. We are launching a creator laptop and think your audience would care about the performance angle.',
      expiresAt: daysFromNow(5),
    }),
    ensureOutreachSignal({
      forUserId: msmeIds[1],
      creatorId: creatorIds[6],
      signalType: 'niche_match',
      signalData: { cuisine: 'regional vegetarian', avgViews: 17000 },
      suggestedMessage: 'Your regional vegetarian recipes are a strong fit for our snack box launch.',
      expiresAt: daysFromNow(7),
    }),
    ensureOutreachLog({
      senderId: msmeIds[0],
      recipientId: creatorIds[5],
      recipientEmail: 'meera.tech@example.com',
      campaignId: campaignIds[0],
      subject: 'Creator laptop launch collab',
      message: 'We liked your AI tools reel and would like to explore a launch collab.',
      status: 'replied',
      sentAt: daysFromNow(-4),
      respondedAt: daysFromNow(-3),
      followUpDueAt: daysFromNow(2),
    }),
  ])

  await Promise.all([
    ensureCrmContact({
      ownerId: msmeIds[0],
      creatorId: creatorIds[5],
      name: 'Meera Nair',
      email: 'meera.tech@example.com',
      platform: 'instagram',
      handle: '@meera.tech',
      stage: 'negotiation',
      notes: 'Good AI workflow fit. Asked for laptop spec sheet.',
      tags: ['tech', 'ai-tools', 'warm'],
      nextStep: 'Send spec sheet and usage rights clause',
      lastContactedAt: daysFromNow(-3),
      followUpDueAt: daysFromNow(2),
    }),
    ensureCrmContact({
      ownerId: msmeIds[1],
      creatorId: creatorIds[6],
      name: 'Tara Singh',
      email: 'tara.food@example.com',
      platform: 'instagram',
      handle: '@tara.cooks',
      stage: 'qualified',
      notes: 'Vegetarian snack angle fits upcoming bundle.',
      tags: ['food', 'regional'],
      nextStep: 'Share product hamper options',
      followUpDueAt: daysFromNow(1),
    }),
  ])

  await Promise.all([
    db.insert(creatorPlatformAccounts).values({
      creatorId: creatorIds[0],
      platform: 'youtube',
      handle: '@arjuntech',
      scopes: ['read:analytics'],
      isActive: true,
      expiresAt: daysFromNow(60),
    }).onConflictDoUpdate({
      target: [creatorPlatformAccounts.creatorId, creatorPlatformAccounts.platform],
      set: { handle: '@arjuntech', isActive: true, expiresAt: daysFromNow(60), updatedAt: new Date() },
    }),
    db.insert(creatorBankDetails).values({
      creatorId: creatorIds[0],
      accountHolderName: 'Arjun Mehta',
      accountNumberEncrypted: 'demo_encrypted_account',
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank',
      upiId: 'arjun@upi',
      panNumber: 'ABCDE1234F',
      isVerified: true,
      verifiedAt: daysFromNow(-30),
      verifiedBy: adminId,
    }).onConflictDoUpdate({
      target: creatorBankDetails.creatorId,
      set: { isVerified: true, verifiedAt: daysFromNow(-30), verifiedBy: adminId, updatedAt: new Date() },
    }),
  ])

  await Promise.all([
    ensureInboundBrief({
      creatorId: creatorIds[0],
      brandName: 'UrbanDesk',
      contactEmail: 'partnerships@urbandesk.example',
      product: 'Standing desk converter',
      budget: '35000',
      timeline: 'June campaign',
      message: 'Looking for a creator productivity integration.',
      status: 'new',
    }),
    ensureAdminNotification({
      type: 'campaign_review',
      title: 'Protein starter kit reels pending review',
      body: 'FlexFuel Nutrition submitted a high-priority campaign for approval.',
      resourceType: 'campaign',
      resourceId: campaignIds[2],
    }),
    ensureAdminNotification({
      type: 'dispute_opened',
      title: 'Deliverable dispute needs review',
      body: 'FlexFuel Nutrition raised a deliverable dispute on a fitness campaign.',
      resourceType: 'deal',
      resourceId: disputedDealId,
    }),
    db.insert(competitorProfiles).values({
      watcherId: creatorIds[0],
      subjectId: creatorIds[5],
      notes: 'Tracks AI app review formats and short-form velocity.',
    }).onConflictDoNothing(),
  ])

  return { campaignIds, dealIds: [paidDealId, activeDealId, disputedDealId] }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run the seed script.')
  }

  const passwordHash = await passwordHashPromise
  const adminId = await ensureProfile(
    {
      email: 'admin@tribesync.in',
      fullName: 'TribeSync Admin',
      role: 'admin',
      publicSlug: 'tribesync-admin',
      isVerified: true,
    },
    passwordHash,
  )

  const creatorIds = await Promise.all(creators.map((creator) => ensureProfile(creator, passwordHash)))
  const msmeIds = await Promise.all(msmes.map((msme) => ensureProfile(msme, passwordHash)))

  for (const [niche, band, p25, median, p75] of marketRates) {
    await db
      .insert(marketRateDefaults)
      .values({
        niche,
        audienceBand: band,
        rateP25: p25,
        rateMedian: median,
        rateP75: p75,
        dealCount: 10,
        source: 'estimated',
      })
      .onConflictDoUpdate({
        target: [marketRateDefaults.niche, marketRateDefaults.audienceBand],
        set: {
          rateP25: p25,
          rateMedian: median,
          rateP75: p75,
          dealCount: 10,
          source: 'estimated',
        },
      })
  }

  const demo = await seedDemoGraph(adminId, creatorIds, msmeIds)

  console.log(
    `Seed complete. Admin: ${adminId}. Creators: ${creatorIds.length}. MSMEs: ${msmeIds.length}. Campaigns: ${demo.campaignIds.length}. Deals: ${demo.dealIds.length}.`,
  )
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown seed failure'
    console.error(message)
    process.exit(1)
  })
