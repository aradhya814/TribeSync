import 'dotenv/config'

import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

import { calculateSponsorshipReadiness } from '@/lib/api/profiles'
import { db } from '@/lib/db'
import {
  campaigns,
  marketRateDefaults,
  notificationPrefs,
  profiles,
  userRoles,
  type AppRole,
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
    acceptsSponsorships: true,
    engagementRate: '6.40',
    postingFrequency: 'weekly',
    enrichedSummary: 'Tech tutorial creator with strong laptop, gaming, and productivity audiences.',
    enrichedTags: ['gaming laptops', 'tutorials', 'reviews'],
    enrichedContentStyle: 'tutorial',
    publicSlug: 'arjun-mehta',
    isVerified: true,
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
    acceptsSponsorships: true,
    engagementRate: '5.80',
    postingFrequency: 'weekly',
    enrichedSummary: 'Food creator covering quick recipes, restaurant finds, and kitchen products.',
    enrichedTags: ['recipes', 'restaurants', 'kitchen'],
    enrichedContentStyle: 'review',
    publicSlug: 'kabir-rao',
    isVerified: true,
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
    acceptsSponsorships: true,
    engagementRate: '4.90',
    postingFrequency: 'weekly',
    enrichedSummary: 'Finance educator simplifying savings, tax, and small-business money decisions.',
    enrichedTags: ['personal finance', 'tax', 'msme'],
    enrichedContentStyle: 'tutorial',
    publicSlug: 'naina-shah',
    isVerified: true,
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
    acceptsSponsorships: true,
    engagementRate: '8.20',
    postingFrequency: 'biweekly',
    enrichedSummary: 'Fitness creator known for home workouts and beginner-friendly routines.',
    enrichedTags: ['home workouts', 'nutrition', 'beginners'],
    enrichedContentStyle: 'tutorial',
    publicSlug: 'dev-iyer',
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
    secondaryNiche: 'productivity',
    contentMixRatio: '80/20',
    acceptsSponsorships: true,
    engagementRate: '6.90',
    postingFrequency: 'weekly',
    enrichedSummary: 'Tech explainer focused on AI tools, apps, and workflow automation.',
    enrichedTags: ['ai tools', 'apps', 'automation'],
    enrichedContentStyle: 'review',
    publicSlug: 'meera-nair',
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
    acceptsSponsorships: true,
    engagementRate: '7.40',
    postingFrequency: 'biweekly',
    enrichedSummary: 'Home cooking creator with strong vegetarian and regional recipe engagement.',
    enrichedTags: ['vegetarian', 'regional', 'home cooking'],
    enrichedContentStyle: 'storytelling',
    publicSlug: 'tara-singh',
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
    acceptsSponsorships: true,
    engagementRate: '5.20',
    postingFrequency: 'weekly',
    enrichedSummary: 'Finance creator focused on investing basics and young earners.',
    enrichedTags: ['investing', 'basics', 'young earners'],
    enrichedContentStyle: 'tutorial',
    publicSlug: 'rohan-bansal',
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
    acceptsSponsorships: true,
    engagementRate: '7.70',
    postingFrequency: 'weekly',
    enrichedSummary: 'Fitness creator with strong women-led wellness and strength content.',
    enrichedTags: ['strength', 'wellness', 'women'],
    enrichedContentStyle: 'tutorial',
    publicSlug: 'anjali-menon',
    isVerified: true,
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
        isVerified: profile.isVerified ?? false,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, existing.id))

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
      isVerified: profile.isVerified ?? false,
      status: 'active',
    })
    .returning({ id: profiles.id })

  await db.insert(userRoles).values({ userId: created.id, role: profile.role })
  await db.insert(notificationPrefs).values({ userId: created.id })

  return created.id
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

  await db.insert(campaigns).values([
    {
      createdBy: msmeIds[0],
      title: 'Gaming laptop launch',
      description: 'Tech tutorial creators for a new performance laptop launch.',
      goal: 'Drive launch awareness and qualified traffic.',
      niche: 'tech',
      budget: '60000',
      status: 'live',
      campaignType: 'targeted',
      targetCreatorId: creatorIds[0],
      minAvgViews: 8000,
      minSubscribers: 10000,
      requiredPlatforms: ['youtube'],
      requiredContentStyle: 'tutorial',
      deliverables: 'One YouTube tutorial and two Instagram story frames.',
    },
    {
      createdBy: msmeIds[1],
      title: 'Regional snack box launch',
      description: 'Food creators to showcase a new snack subscription box.',
      goal: 'Generate orders with coupon attribution.',
      niche: 'food',
      budget: '45000',
      status: 'live',
      campaignType: 'open',
      minAvgViews: 10000,
      requiredPlatforms: ['instagram'],
      requiredContentStyle: 'review',
      deliverables: 'One reel and one story set.',
    },
  ])

  console.log(`Seed complete. Admin: ${adminId}. Creators: ${creatorIds.length}. MSMEs: ${msmeIds.length}.`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure'
  console.error(message)
  process.exit(1)
})
