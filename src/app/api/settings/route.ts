import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { maybeEnrichProfile } from '@/lib/api/profiles'
import { db } from '@/lib/db'
import { creatorBankDetails, notificationPrefs, profiles } from '@/lib/db/schema'

const settingsSchema = z.discriminatedUnion('section', [
  z.object({
    section: z.literal('profile'),
    fullName: z.string().optional(),
    avatarUrl: z.string().optional(),
    bio: z.string().optional(),
    location: z.string().optional(),
    niche: z.string().optional(),
    platforms: z.array(z.string()).optional(),
    company: z.string().optional(),
    industry: z.string().optional(),
    website: z.string().optional(),
  }),
  z.object({
    section: z.literal('link'),
    linkInBioCta: z.string().optional(),
    linkInBioEnabled: z.boolean().optional(),
  }),
  z.object({
    section: z.literal('notifications'),
    emailCampaignUpdates: z.boolean().optional(),
    emailDealUpdates: z.boolean().optional(),
    emailMilestoneAlerts: z.boolean().optional(),
    emailDisputeAlerts: z.boolean().optional(),
    emailWeeklyDigest: z.boolean().optional(),
  }),
  z.object({
    section: z.literal('bank'),
    accountHolderName: z.string().min(2),
    accountNumber: z.string().min(4).optional(),
    ifscCode: z.string().min(4),
    bankName: z.string().optional(),
    accountType: z.string().optional(),
    upiId: z.string().optional(),
    panNumber: z.string().optional(),
    gstNumber: z.string().optional(),
  }),
  z.object({
    section: z.literal('password'),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
  z.object({
    section: z.literal('delete'),
    confirmation: z.literal('DELETE'),
  }),
])

function encodeAccountNumber(accountNumber: string) {
  return Buffer.from(accountNumber).toString('base64')
}

function maskAccountNumber(encoded: string | null) {
  if (!encoded) return null
  const decoded = Buffer.from(encoded, 'base64').toString('utf8')
  return `••••${decoded.slice(-4)}`
}

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const userId = authResult.session.user.id
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
  const [prefs] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId)).limit(1)
  const [bank] = await db.select().from(creatorBankDetails).where(eq(creatorBankDetails.creatorId, userId)).limit(1)

  return NextResponse.json({
    profile,
    notificationPrefs: prefs,
    bankDetails: bank
      ? {
          ...bank,
          accountNumberEncrypted: undefined,
          maskedAccountNumber: maskAccountNumber(bank.accountNumberEncrypted),
        }
      : null,
  })
}

export async function PATCH(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const parsed = settingsSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 })

  const userId = authResult.session.user.id
  const [oldProfile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
  if (!oldProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  if (parsed.data.section === 'profile') {
    const profileValues = {
      fullName: parsed.data.fullName,
      avatarUrl: parsed.data.avatarUrl,
      bio: parsed.data.bio,
      location: parsed.data.location,
      niche: parsed.data.niche,
      platforms: parsed.data.platforms,
      company: parsed.data.company,
      industry: parsed.data.industry,
      website: parsed.data.website,
    }
    const [profile] = await db
      .update(profiles)
      .set({ ...profileValues, updatedAt: new Date() })
      .where(eq(profiles.id, userId))
      .returning()

    void maybeEnrichProfile(userId, profile.niche, profile.bio, oldProfile.niche, oldProfile.bio, oldProfile.enrichedAt).catch(
      (error) => console.error('Profile enrichment failed', error),
    )

    return NextResponse.json({ profile })
  }

  if (parsed.data.section === 'link') {
    const [profile] = await db
      .update(profiles)
      .set({
        linkInBioCta: parsed.data.linkInBioCta,
        linkInBioEnabled: parsed.data.linkInBioEnabled,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, userId))
      .returning()
    return NextResponse.json({ profile })
  }

  if (parsed.data.section === 'notifications') {
    const notificationValues = {
      emailCampaignUpdates: parsed.data.emailCampaignUpdates,
      emailDealUpdates: parsed.data.emailDealUpdates,
      emailMilestoneAlerts: parsed.data.emailMilestoneAlerts,
      emailDisputeAlerts: parsed.data.emailDisputeAlerts,
      emailWeeklyDigest: parsed.data.emailWeeklyDigest,
    }
    const [prefs] = await db
      .insert(notificationPrefs)
      .values({ userId, ...notificationValues })
      .onConflictDoUpdate({
        target: notificationPrefs.userId,
        set: notificationValues,
      })
      .returning()
    return NextResponse.json({ notificationPrefs: prefs })
  }

  if (parsed.data.section === 'bank') {
    const [existing] = await db.select().from(creatorBankDetails).where(eq(creatorBankDetails.creatorId, userId)).limit(1)
    const accountNumberEncrypted = parsed.data.accountNumber
      ? encodeAccountNumber(parsed.data.accountNumber)
      : existing?.accountNumberEncrypted
    if (!accountNumberEncrypted) return NextResponse.json({ error: 'Account number is required' }, { status: 400 })

    const [bank] = await db
      .insert(creatorBankDetails)
      .values({
        creatorId: userId,
        accountHolderName: parsed.data.accountHolderName,
        accountNumberEncrypted,
        ifscCode: parsed.data.ifscCode,
        bankName: parsed.data.bankName,
        accountType: parsed.data.accountType,
        upiId: parsed.data.upiId,
        panNumber: parsed.data.panNumber,
        gstNumber: parsed.data.gstNumber,
      })
      .onConflictDoUpdate({
        target: creatorBankDetails.creatorId,
        set: {
          accountHolderName: parsed.data.accountHolderName,
          accountNumberEncrypted,
          ifscCode: parsed.data.ifscCode,
          bankName: parsed.data.bankName,
          accountType: parsed.data.accountType,
          upiId: parsed.data.upiId,
          panNumber: parsed.data.panNumber,
          gstNumber: parsed.data.gstNumber,
          updatedAt: new Date(),
        },
      })
      .returning()
    return NextResponse.json({ bankDetails: { ...bank, accountNumberEncrypted: undefined, maskedAccountNumber: maskAccountNumber(accountNumberEncrypted) } })
  }

  if (parsed.data.section === 'password') {
    if (!oldProfile.passwordHash) return NextResponse.json({ error: 'Password login is not configured' }, { status: 400 })
    const isValid = await bcrypt.compare(parsed.data.currentPassword, oldProfile.passwordHash)
    if (!isValid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
    await db.update(profiles).set({ passwordHash, updatedAt: new Date() }).where(eq(profiles.id, userId))
    return NextResponse.json({ success: true })
  }

  await db
    .update(profiles)
    .set({ status: 'suspended', linkInBioEnabled: false, updatedAt: new Date() })
    .where(eq(profiles.id, userId))

  return NextResponse.json({ success: true })
}
