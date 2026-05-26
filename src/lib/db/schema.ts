import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export type JsonRecord = Record<string, unknown>

export type PlaybookTactic = {
  title?: string
  description?: string
  difficulty?: string
  expectedImpact?: string
  timeEstimate?: string
  emoji?: string
  proTips?: string[]
}

const emptyTextArray = sql<string[]>`ARRAY[]::text[]`
const emptyJsonObject = sql<JsonRecord>`'{}'::jsonb`
const emptyJsonArray = sql<unknown[]>`'[]'::jsonb`

const primaryId = () => uuid('id').primaryKey().defaultRandom()
const createdAtColumn = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
const updatedAtColumn = () => timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()

export const appRoleEnum = pgEnum('app_role', ['admin', 'msme', 'creator'])
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'pending'])
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'pending_review',
  'live',
  'completed',
  'archived',
])
export const dealStatusEnum = pgEnum('deal_status', [
  'initiated',
  'active',
  'completed',
  'invoiced',
  'paid',
  'disputed',
])
export const milestoneStatusEnum = pgEnum('milestone_status', [
  'pending',
  'in_progress',
  'completed',
  'approved',
  'rejected',
])
export const escrowStatusEnum = pgEnum('escrow_status', [
  'unfunded',
  'funded',
  'partial_release',
  'completed',
  'refunded',
  'disputed',
])
export const disputeStatusEnum = pgEnum('dispute_status', ['open', 'under_review', 'resolved'])
export const disputeTypeEnum = pgEnum('dispute_type', ['payment', 'deliverable', 'timeline', 'other'])
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled',
])
export const crmStageEnum = pgEnum('crm_stage', [
  'lead',
  'qualified',
  'outreach',
  'negotiation',
  'partner',
])
export const outreachStatusEnum = pgEnum('outreach_status', ['sent', 'delivered', 'read', 'replied'])
export const agentStatusEnum = pgEnum('agent_status', [
  'pending',
  'running',
  'waiting_human',
  'completed',
  'failed',
  'paused',
])

export type AppRole = (typeof appRoleEnum.enumValues)[number]

export const profiles = pgTable('profiles', {
  id: primaryId(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  enrichedSummary: text('enriched_summary'),
  enrichedTags: text('enriched_tags').array(),
  enrichedContentStyle: text('enriched_content_style'),
  enrichedAt: timestamp('enriched_at', { withTimezone: true }),
  location: text('location'),
  niche: text('niche'),
  platforms: text('platforms').array().default(emptyTextArray),
  subscribers: integer('subscribers').default(0),
  avgViews: integer('avg_views').default(0),
  viewSubscriberRatio: decimal('view_subscriber_ratio', { precision: 5, scale: 4 }).generatedAlwaysAs(
    sql`CASE WHEN subscribers > 0 THEN LEAST(avg_views::DECIMAL / subscribers, 9.9999) ELSE 0 END`,
  ),
  engagementRate: decimal('engagement_rate', { precision: 5, scale: 2 }).default('0'),
  postingFrequency: text('posting_frequency'),
  company: text('company'),
  industry: text('industry'),
  website: text('website'),
  publicSlug: text('public_slug').unique(),
  linkInBioEnabled: boolean('link_in_bio_enabled').default(true),
  linkInBioCta: text('link_in_bio_cta').default('Work with me'),
  deliveryReliabilityScore: decimal('delivery_reliability_score', { precision: 5, scale: 2 }).default('0'),
  status: userStatusEnum('status').default('pending'),
  isVerified: boolean('is_verified').default(false),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
})

export const userRoles = pgTable('user_roles', {
  id: primaryId(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' })
    .unique(),
  role: appRoleEnum('role').notNull().default('creator'),
  createdAt: createdAtColumn(),
})

export const campaigns = pgTable('campaigns', {
  id: primaryId(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  goal: text('goal'),
  niche: text('niche'),
  budget: decimal('budget', { precision: 12, scale: 2 }).default('0'),
  timelineStart: date('timeline_start'),
  timelineEnd: date('timeline_end'),
  status: campaignStatusEnum('status').default('draft'),
  priority: text('priority').default('medium'),
  campaignType: text('campaign_type').default('targeted'),
  targetCreatorId: uuid('target_creator_id').references(() => profiles.id),
  minAvgViews: integer('min_avg_views').default(0),
  minSubscribers: integer('min_subscribers').default(0),
  requiredPlatforms: text('required_platforms').array().default(emptyTextArray),
  requiredContentStyle: text('required_content_style'),
  deliverables: text('deliverables'),
  maxApplicants: integer('max_applicants').default(20),
  applicationDeadline: date('application_deadline'),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
})

export const collabDeals = pgTable('collab_deals', {
  id: primaryId(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id').references(() => profiles.id),
  msmeId: uuid('msme_id').references(() => profiles.id),
  status: dealStatusEnum('status').default('initiated'),
  agreedAmount: decimal('agreed_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  platformFee: decimal('platform_fee', { precision: 12, scale: 2 }).generatedAlwaysAs(
    sql`agreed_amount * 0.10`,
  ),
  creatorPayout: decimal('creator_payout', { precision: 12, scale: 2 }).generatedAlwaysAs(
    sql`agreed_amount * 0.90`,
  ),
  terms: text('terms'),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
})

export const milestones = pgTable('milestones', {
  id: primaryId(),
  dealId: uuid('deal_id')
    .notNull()
    .references(() => collabDeals.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: date('due_date'),
  status: milestoneStatusEnum('status').default('pending'),
  proofUrl: text('proof_url'),
  proofFileUrl: text('proof_file_url'),
  proofSubmittedAt: timestamp('proof_submitted_at', { withTimezone: true }),
  proofVerified: boolean('proof_verified').default(false),
  proofVerifiedAt: timestamp('proof_verified_at', { withTimezone: true }),
  proofPlatform: text('proof_platform'),
  proofMetadata: jsonb('proof_metadata').$type<JsonRecord>(),
  proofVerificationError: text('proof_verification_error'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approvedBy: uuid('approved_by').references(() => profiles.id),
  rejectionReason: text('rejection_reason'),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
})

export const escrows = pgTable('escrows', {
  id: primaryId(),
  dealId: uuid('deal_id')
    .notNull()
    .references(() => collabDeals.id, { onDelete: 'cascade' })
    .unique(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  status: escrowStatusEnum('status').default('unfunded'),
  fundedAt: timestamp('funded_at', { withTimezone: true }),
  paymentReference: text('payment_reference'),
  paymentGateway: text('payment_gateway'),
  releasedAmount: decimal('released_amount', { precision: 12, scale: 2 }).default('0'),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
})

export const disputes = pgTable('disputes', {
  id: primaryId(),
  dealId: uuid('deal_id').references(() => collabDeals.id),
  raisedBy: uuid('raised_by').references(() => profiles.id),
  disputeType: disputeTypeEnum('dispute_type').notNull(),
  description: text('description').notNull(),
  status: disputeStatusEnum('status').default('open'),
  resolution: text('resolution'),
  resolvedBy: uuid('resolved_by').references(() => profiles.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: createdAtColumn(),
})

export const crmContacts = pgTable('crm_contacts', {
  id: primaryId(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id').references(() => profiles.id),
  name: text('name').notNull(),
  email: text('email'),
  platform: text('platform'),
  handle: text('handle'),
  stage: crmStageEnum('stage').default('lead'),
  notes: text('notes'),
  tags: text('tags').array().default(emptyTextArray),
  nextStep: text('next_step'),
  lastContactedAt: timestamp('last_contacted_at', { withTimezone: true }),
  followUpDueAt: timestamp('follow_up_due_at', { withTimezone: true }),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
})

export const outreachLogs = pgTable('outreach_logs', {
  id: primaryId(),
  senderId: uuid('sender_id').references(() => profiles.id),
  recipientId: uuid('recipient_id').references(() => profiles.id),
  recipientEmail: text('recipient_email'),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  subject: text('subject'),
  message: text('message').notNull(),
  status: outreachStatusEnum('status').default('sent'),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  followUpDueAt: timestamp('follow_up_due_at', { withTimezone: true }),
  createdAt: createdAtColumn(),
})

export const tribesyncChronicles = pgTable(
  'tribesync_chronicles',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    month: text('month').notNull(),
    title: text('title'),
    metrics: jsonb('metrics').$type<JsonRecord>().default(emptyJsonObject),
    insights: text('insights').array().default(emptyTextArray),
    isPublic: boolean('is_public').default(false),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex('tribesync_chronicles_user_month_idx').on(table.userId, table.month)],
)

export const rankings = pgTable(
  'rankings',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    period: text('period').notNull(),
    rankPosition: integer('rank_position').notNull(),
    niche: text('niche'),
    score: decimal('score', { precision: 10, scale: 4 }).default('0'),
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('rankings_user_period_niche_idx').on(table.userId, table.period, table.niche),
    index('rankings_period_position_idx').on(table.period, table.rankPosition),
  ],
)

export const competitorProfiles = pgTable(
  'competitor_profiles',
  {
    id: primaryId(),
    watcherId: uuid('watcher_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    notes: text('notes'),
    addedAt: timestamp('added_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex('competitor_profiles_watcher_subject_idx').on(table.watcherId, table.subjectId)],
)

export const traceabilityPacks = pgTable('traceability_packs', {
  id: primaryId(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  shortlink: text('shortlink'),
  couponCode: text('coupon_code'),
  referralCode: text('referral_code'),
  createdAt: createdAtColumn(),
})

export const notificationPrefs = pgTable('notification_prefs', {
  id: primaryId(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' })
    .unique(),
  emailCampaignUpdates: boolean('email_campaign_updates').default(true),
  emailDealUpdates: boolean('email_deal_updates').default(true),
  emailMilestoneAlerts: boolean('email_milestone_alerts').default(true),
  emailDisputeAlerts: boolean('email_dispute_alerts').default(true),
  emailWeeklyDigest: boolean('email_weekly_digest').default(true),
  createdAt: createdAtColumn(),
})

export const adminNotifications = pgTable('admin_notifications', {
  id: primaryId(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  resourceType: text('resource_type'),
  resourceId: uuid('resource_id'),
  isRead: boolean('is_read').default(false),
  createdAt: createdAtColumn(),
})

export const playbooks = pgTable(
  'playbooks',
  {
    id: primaryId(),
    niche: text('niche').notNull(),
    weekOf: date('week_of').notNull(),
    tactics: jsonb('tactics').$type<PlaybookTactic[]>().notNull().default(emptyJsonArray),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex('playbooks_niche_week_idx').on(table.niche, table.weekOf)],
)

export const campaignApplications = pgTable(
  'campaign_applications',
  {
    id: primaryId(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    pitch: text('pitch'),
    proposedRate: decimal('proposed_rate', { precision: 12, scale: 2 }),
    status: text('status').default('pending'),
    appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => profiles.id),
  },
  (table) => [uniqueIndex('campaign_applications_campaign_creator_idx').on(table.campaignId, table.creatorId)],
)

export const inboundBriefs = pgTable('inbound_briefs', {
  id: primaryId(),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  brandName: text('brand_name').notNull(),
  contactEmail: text('contact_email').notNull(),
  product: text('product').notNull(),
  budget: decimal('budget', { precision: 12, scale: 2 }),
  timeline: text('timeline'),
  message: text('message'),
  status: text('status').default('new'),
  ipAddress: text('ip_address'),
  convertedCampaignId: uuid('converted_campaign_id').references(() => campaigns.id),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow(),
})

export const outreachSignals = pgTable('outreach_signals', {
  id: primaryId(),
  forUserId: uuid('for_user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  signalType: text('signal_type').notNull(),
  signalData: jsonb('signal_data').$type<JsonRecord>().default(emptyJsonObject),
  suggestedMessage: text('suggested_message'),
  isActedOn: boolean('is_acted_on').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
})

export const invoices = pgTable('invoices', {
  id: primaryId(),
  dealId: uuid('deal_id')
    .notNull()
    .references(() => collabDeals.id, { onDelete: 'cascade' })
    .unique(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  creatorId: uuid('creator_id').references(() => profiles.id),
  msmeId: uuid('msme_id').references(() => profiles.id),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  platformFee: decimal('platform_fee', { precision: 12, scale: 2 }).notNull(),
  creatorPayout: decimal('creator_payout', { precision: 12, scale: 2 }).notNull(),
  status: invoiceStatusEnum('status').default('draft'),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  dueDate: date('due_date'),
  pdfUrl: text('pdf_url'),
  createdAt: createdAtColumn(),
})

export const creatorBankDetails = pgTable('creator_bank_details', {
  id: primaryId(),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' })
    .unique(),
  accountHolderName: text('account_holder_name').notNull(),
  accountNumberEncrypted: text('account_number_encrypted').notNull(),
  ifscCode: text('ifsc_code').notNull(),
  bankName: text('bank_name'),
  accountType: text('account_type').default('savings'),
  upiId: text('upi_id'),
  panNumber: text('pan_number'),
  gstNumber: text('gst_number'),
  isVerified: boolean('is_verified').default(false),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verifiedBy: uuid('verified_by').references(() => profiles.id),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
})

export const chronicleRunLog = pgTable(
  'chronicle_run_log',
  {
    id: primaryId(),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    month: text('month').notNull(),
    status: text('status').notNull(),
    errorMessage: text('error_message'),
    processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex('chronicle_run_log_creator_month_idx').on(table.creatorId, table.month)],
)

export const auditLogs = pgTable('audit_logs', {
  id: primaryId(),
  actorId: uuid('actor_id').references(() => profiles.id),
  action: text('action').notNull(),
  targetTable: text('target_table'),
  targetId: uuid('target_id'),
  oldData: jsonb('old_data').$type<JsonRecord>(),
  newData: jsonb('new_data').$type<JsonRecord>(),
  ipAddress: text('ip_address'),
  createdAt: createdAtColumn(),
})

export const agentRuns = pgTable('agent_runs', {
  id: primaryId(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => profiles.id),
  agentType: text('agent_type').notNull().default('deal_origination'),
  status: agentStatusEnum('status').default('pending'),
  summary: text('summary'),
  outputData: jsonb('output_data').$type<JsonRecord>().default(emptyJsonObject),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: createdAtColumn(),
})

export const agentSteps = pgTable(
  'agent_steps',
  {
    id: primaryId(),
    runId: uuid('run_id')
      .notNull()
      .references(() => agentRuns.id, { onDelete: 'cascade' }),
    stepKey: text('step_key').notNull(),
    label: text('label').notNull(),
    detail: text('detail'),
    status: text('status').notNull(),
    outputData: jsonb('output_data').$type<JsonRecord>().default(emptyJsonObject),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('agent_steps_run_step_key_idx').on(table.runId, table.stepKey),
    index('agent_steps_run_started_idx').on(table.runId, table.startedAt),
  ],
)

export const marketRateDefaults = pgTable(
  'market_rate_defaults',
  {
    id: primaryId(),
    niche: text('niche').notNull(),
    audienceBand: text('audience_band').notNull(),
    rateP25: decimal('rate_p25', { precision: 12, scale: 2 }).notNull(),
    rateMedian: decimal('rate_median', { precision: 12, scale: 2 }).notNull(),
    rateP75: decimal('rate_p75', { precision: 12, scale: 2 }).notNull(),
    dealCount: integer('deal_count').default(0),
    source: text('source').default('estimated'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex('market_rate_defaults_niche_band_idx').on(table.niche, table.audienceBand)],
)

export const creatorPlatformAccounts = pgTable(
  'creator_platform_accounts',
  {
    id: primaryId(),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    handle: text('handle'),
    accessTokenEncrypted: text('access_token_encrypted'),
    refreshTokenEncrypted: text('refresh_token_encrypted'),
    scopes: text('scopes').array().default(emptyTextArray),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').default(true),
    connectedAt: timestamp('connected_at', { withTimezone: true }).defaultNow(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex('creator_platform_accounts_creator_platform_idx').on(table.creatorId, table.platform)],
)

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
export type Campaign = typeof campaigns.$inferSelect
export type NewCampaign = typeof campaigns.$inferInsert
export type CollabDeal = typeof collabDeals.$inferSelect
export type NewCollabDeal = typeof collabDeals.$inferInsert
export type AgentRun = typeof agentRuns.$inferSelect
export type AgentStep = typeof agentSteps.$inferSelect
