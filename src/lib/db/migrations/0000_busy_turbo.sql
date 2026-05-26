CREATE TYPE "public"."agent_status" AS ENUM('pending', 'running', 'waiting_human', 'completed', 'failed', 'paused');--> statement-breakpoint
CREATE TYPE "public"."app_role" AS ENUM('admin', 'msme', 'creator');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'pending_review', 'live', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."crm_stage" AS ENUM('lead', 'qualified', 'outreach', 'negotiation', 'partner');--> statement-breakpoint
CREATE TYPE "public"."deal_status" AS ENUM('initiated', 'active', 'completed', 'invoiced', 'paid', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'under_review', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."dispute_type" AS ENUM('payment', 'deliverable', 'timeline', 'other');--> statement-breakpoint
CREATE TYPE "public"."escrow_status" AS ENUM('unfunded', 'funded', 'partial_release', 'completed', 'refunded', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('pending', 'in_progress', 'completed', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."outreach_status" AS ENUM('sent', 'delivered', 'read', 'replied');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'pending');--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"resource_type" text,
	"resource_id" uuid,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid,
	"agent_type" text DEFAULT 'deal_origination' NOT NULL,
	"status" "agent_status" DEFAULT 'pending',
	"summary" text,
	"output_data" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step_key" text NOT NULL,
	"label" text NOT NULL,
	"detail" text,
	"status" text NOT NULL,
	"output_data" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_table" text,
	"target_id" uuid,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"pitch" text,
	"proposed_rate" numeric(12, 2),
	"status" text DEFAULT 'pending',
	"applied_at" timestamp with time zone DEFAULT now(),
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"goal" text,
	"niche" text,
	"budget" numeric(12, 2) DEFAULT '0',
	"timeline_start" date,
	"timeline_end" date,
	"status" "campaign_status" DEFAULT 'draft',
	"priority" text DEFAULT 'medium',
	"campaign_type" text DEFAULT 'targeted',
	"target_creator_id" uuid,
	"min_avg_views" integer DEFAULT 0,
	"min_subscribers" integer DEFAULT 0,
	"required_platforms" text[] DEFAULT ARRAY[]::text[],
	"required_content_style" text,
	"deliverables" text,
	"max_applicants" integer DEFAULT 20,
	"application_deadline" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chronicle_run_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"month" text NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"processed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "collab_deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"creator_id" uuid,
	"msme_id" uuid,
	"status" "deal_status" DEFAULT 'initiated',
	"agreed_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"platform_fee" numeric(12, 2) GENERATED ALWAYS AS (agreed_amount * 0.10) STORED,
	"creator_payout" numeric(12, 2) GENERATED ALWAYS AS (agreed_amount * 0.90) STORED,
	"terms" text,
	"signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"watcher_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"notes" text,
	"added_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "creator_bank_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"account_holder_name" text NOT NULL,
	"account_number_encrypted" text NOT NULL,
	"ifsc_code" text NOT NULL,
	"bank_name" text,
	"account_type" text DEFAULT 'savings',
	"upi_id" text,
	"pan_number" text,
	"gst_number" text,
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_bank_details_creator_id_unique" UNIQUE("creator_id")
);
--> statement-breakpoint
CREATE TABLE "creator_platform_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"handle" text,
	"access_token_encrypted" text,
	"refresh_token_encrypted" text,
	"scopes" text[] DEFAULT ARRAY[]::text[],
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"connected_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"creator_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"platform" text,
	"handle" text,
	"stage" "crm_stage" DEFAULT 'lead',
	"notes" text,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"next_step" text,
	"last_contacted_at" timestamp with time zone,
	"follow_up_due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"raised_by" uuid,
	"dispute_type" "dispute_type" NOT NULL,
	"description" text NOT NULL,
	"status" "dispute_status" DEFAULT 'open',
	"resolution" text,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"status" "escrow_status" DEFAULT 'unfunded',
	"funded_at" timestamp with time zone,
	"payment_reference" text,
	"payment_gateway" text,
	"released_amount" numeric(12, 2) DEFAULT '0',
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "escrows_deal_id_unique" UNIQUE("deal_id")
);
--> statement-breakpoint
CREATE TABLE "inbound_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"brand_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"product" text NOT NULL,
	"budget" numeric(12, 2),
	"timeline" text,
	"message" text,
	"status" text DEFAULT 'new',
	"ip_address" text,
	"converted_campaign_id" uuid,
	"submitted_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"creator_id" uuid,
	"msme_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"platform_fee" numeric(12, 2) NOT NULL,
	"creator_payout" numeric(12, 2) NOT NULL,
	"status" "invoice_status" DEFAULT 'draft',
	"issued_at" timestamp with time zone DEFAULT now(),
	"paid_at" timestamp with time zone,
	"due_date" date,
	"pdf_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_deal_id_unique" UNIQUE("deal_id"),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "market_rate_defaults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche" text NOT NULL,
	"audience_band" text NOT NULL,
	"rate_p25" numeric(12, 2) NOT NULL,
	"rate_median" numeric(12, 2) NOT NULL,
	"rate_p75" numeric(12, 2) NOT NULL,
	"deal_count" integer DEFAULT 0,
	"source" text DEFAULT 'estimated',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" date,
	"status" "milestone_status" DEFAULT 'pending',
	"proof_url" text,
	"proof_file_url" text,
	"proof_submitted_at" timestamp with time zone,
	"proof_verified" boolean DEFAULT false,
	"proof_verified_at" timestamp with time zone,
	"proof_platform" text,
	"proof_metadata" jsonb,
	"proof_verification_error" text,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_prefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_campaign_updates" boolean DEFAULT true,
	"email_deal_updates" boolean DEFAULT true,
	"email_milestone_alerts" boolean DEFAULT true,
	"email_dispute_alerts" boolean DEFAULT true,
	"email_weekly_digest" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_prefs_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "outreach_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid,
	"recipient_id" uuid,
	"recipient_email" text,
	"campaign_id" uuid,
	"subject" text,
	"message" text NOT NULL,
	"status" "outreach_status" DEFAULT 'sent',
	"sent_at" timestamp with time zone DEFAULT now(),
	"responded_at" timestamp with time zone,
	"follow_up_due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"for_user_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"signal_type" text NOT NULL,
	"signal_data" jsonb DEFAULT '{}'::jsonb,
	"suggested_message" text,
	"is_acted_on" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "playbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche" text NOT NULL,
	"week_of" date NOT NULL,
	"tactics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"full_name" text,
	"avatar_url" text,
	"bio" text,
	"enriched_summary" text,
	"enriched_tags" text[],
	"enriched_content_style" text,
	"enriched_at" timestamp with time zone,
	"location" text,
	"niche" text,
	"platforms" text[] DEFAULT ARRAY[]::text[],
	"subscribers" integer DEFAULT 0,
	"avg_views" integer DEFAULT 0,
	"view_subscriber_ratio" numeric(5, 4) GENERATED ALWAYS AS (CASE WHEN subscribers > 0 THEN LEAST(avg_views::DECIMAL / subscribers, 9.9999) ELSE 0 END) STORED,
	"engagement_rate" numeric(5, 2) DEFAULT '0',
	"posting_frequency" text,
	"company" text,
	"industry" text,
	"website" text,
	"public_slug" text,
	"link_in_bio_enabled" boolean DEFAULT true,
	"link_in_bio_cta" text DEFAULT 'Work with me',
	"delivery_reliability_score" numeric(5, 2) DEFAULT '0',
	"status" "user_status" DEFAULT 'pending',
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email"),
	CONSTRAINT "profiles_public_slug_unique" UNIQUE("public_slug")
);
--> statement-breakpoint
CREATE TABLE "rankings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period" text NOT NULL,
	"rank_position" integer NOT NULL,
	"niche" text,
	"score" numeric(10, 4) DEFAULT '0',
	"calculated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "traceability_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"shortlink" text,
	"coupon_code" text,
	"referral_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tribesync_chronicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"month" text NOT NULL,
	"title" text,
	"metrics" jsonb DEFAULT '{}'::jsonb,
	"insights" text[] DEFAULT ARRAY[]::text[],
	"is_public" boolean DEFAULT false,
	"generated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "app_role" DEFAULT 'creator' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_steps" ADD CONSTRAINT "agent_steps_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_applications" ADD CONSTRAINT "campaign_applications_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_applications" ADD CONSTRAINT "campaign_applications_creator_id_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_applications" ADD CONSTRAINT "campaign_applications_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_target_creator_id_profiles_id_fk" FOREIGN KEY ("target_creator_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chronicle_run_log" ADD CONSTRAINT "chronicle_run_log_creator_id_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collab_deals" ADD CONSTRAINT "collab_deals_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collab_deals" ADD CONSTRAINT "collab_deals_creator_id_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collab_deals" ADD CONSTRAINT "collab_deals_msme_id_profiles_id_fk" FOREIGN KEY ("msme_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_profiles" ADD CONSTRAINT "competitor_profiles_watcher_id_profiles_id_fk" FOREIGN KEY ("watcher_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_profiles" ADD CONSTRAINT "competitor_profiles_subject_id_profiles_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_bank_details" ADD CONSTRAINT "creator_bank_details_creator_id_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_bank_details" ADD CONSTRAINT "creator_bank_details_verified_by_profiles_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_platform_accounts" ADD CONSTRAINT "creator_platform_accounts_creator_id_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_creator_id_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_deal_id_collab_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."collab_deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raised_by_profiles_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_profiles_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_deal_id_collab_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."collab_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_briefs" ADD CONSTRAINT "inbound_briefs_creator_id_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_briefs" ADD CONSTRAINT "inbound_briefs_converted_campaign_id_campaigns_id_fk" FOREIGN KEY ("converted_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deal_id_collab_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."collab_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_creator_id_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_msme_id_profiles_id_fk" FOREIGN KEY ("msme_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_deal_id_collab_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."collab_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_approved_by_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_logs" ADD CONSTRAINT "outreach_logs_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_logs" ADD CONSTRAINT "outreach_logs_recipient_id_profiles_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_logs" ADD CONSTRAINT "outreach_logs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_signals" ADD CONSTRAINT "outreach_signals_for_user_id_profiles_id_fk" FOREIGN KEY ("for_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_signals" ADD CONSTRAINT "outreach_signals_creator_id_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traceability_packs" ADD CONSTRAINT "traceability_packs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tribesync_chronicles" ADD CONSTRAINT "tribesync_chronicles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_steps_run_step_key_idx" ON "agent_steps" USING btree ("run_id","step_key");--> statement-breakpoint
CREATE INDEX "agent_steps_run_started_idx" ON "agent_steps" USING btree ("run_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_applications_campaign_creator_idx" ON "campaign_applications" USING btree ("campaign_id","creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chronicle_run_log_creator_month_idx" ON "chronicle_run_log" USING btree ("creator_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "competitor_profiles_watcher_subject_idx" ON "competitor_profiles" USING btree ("watcher_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_platform_accounts_creator_platform_idx" ON "creator_platform_accounts" USING btree ("creator_id","platform");--> statement-breakpoint
CREATE UNIQUE INDEX "market_rate_defaults_niche_band_idx" ON "market_rate_defaults" USING btree ("niche","audience_band");--> statement-breakpoint
CREATE UNIQUE INDEX "playbooks_niche_week_idx" ON "playbooks" USING btree ("niche","week_of");--> statement-breakpoint
CREATE UNIQUE INDEX "rankings_user_period_niche_idx" ON "rankings" USING btree ("user_id","period","niche");--> statement-breakpoint
CREATE INDEX "rankings_period_position_idx" ON "rankings" USING btree ("period","rank_position");--> statement-breakpoint
CREATE UNIQUE INDEX "tribesync_chronicles_user_month_idx" ON "tribesync_chronicles" USING btree ("user_id","month");