ALTER TABLE collab_deals
  ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(12,2)
    GENERATED ALWAYS AS (agreed_amount * 0.10) STORED,
  ADD COLUMN IF NOT EXISTS creator_payout DECIMAL(12,2)
    GENERATED ALWAYS AS (agreed_amount * 0.90) STORED;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS view_subscriber_ratio DECIMAL(5,4)
    GENERATED ALWAYS AS (
      CASE WHEN subscribers > 0
      THEN LEAST(avg_views::DECIMAL / subscribers, 9.9999)
      ELSE 0 END
    ) STORED;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS collab_deals_updated_at ON collab_deals;
CREATE TRIGGER collab_deals_updated_at
  BEFORE UPDATE ON collab_deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS milestones_updated_at ON milestones;
CREATE TRIGGER milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS escrows_updated_at ON escrows;
CREATE TRIGGER escrows_updated_at
  BEFORE UPDATE ON escrows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS crm_contacts_updated_at ON crm_contacts;
CREATE TRIGGER crm_contacts_updated_at
  BEFORE UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tribesync_chronicles_updated_at ON tribesync_chronicles;
CREATE TRIGGER tribesync_chronicles_updated_at
  BEFORE UPDATE ON tribesync_chronicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS creator_bank_details_updated_at ON creator_bank_details;
CREATE TRIGGER creator_bank_details_updated_at
  BEFORE UPDATE ON creator_bank_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS market_rate_defaults_updated_at ON market_rate_defaults;
CREATE TRIGGER market_rate_defaults_updated_at
  BEFORE UPDATE ON market_rate_defaults
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS creator_platform_accounts_updated_at ON creator_platform_accounts;
CREATE TRIGGER creator_platform_accounts_updated_at
  BEFORE UPDATE ON creator_platform_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION maybe_activate_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending'
    AND NULLIF(TRIM(COALESCE(NEW.full_name, '')), '') IS NOT NULL
    AND NULLIF(TRIM(COALESCE(NEW.niche, '')), '') IS NOT NULL
  THEN
    NEW.status = 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maybe_activate_profile_trigger ON profiles;
CREATE TRIGGER maybe_activate_profile_trigger
  BEFORE INSERT OR UPDATE OF full_name, niche, status ON profiles
  FOR EACH ROW EXECUTE FUNCTION maybe_activate_profile();

CREATE OR REPLACE FUNCTION generate_public_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  candidate_slug TEXT;
  suffix INTEGER := 0;
BEGIN
  IF NEW.public_slug IS NOT NULL AND LENGTH(TRIM(NEW.public_slug)) > 0 THEN
    NEW.public_slug = LOWER(REGEXP_REPLACE(TRIM(NEW.public_slug), '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.public_slug = TRIM(BOTH '-' FROM NEW.public_slug);
    RETURN NEW;
  END IF;

  base_slug = LOWER(REGEXP_REPLACE(TRIM(COALESCE(NEW.full_name, SPLIT_PART(NEW.email, '@', 1))), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug = TRIM(BOTH '-' FROM base_slug);

  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug = 'creator';
  END IF;

  candidate_slug = base_slug;

  WHILE EXISTS (
    SELECT 1 FROM profiles
    WHERE public_slug = candidate_slug
      AND id IS DISTINCT FROM NEW.id
  ) LOOP
    suffix = suffix + 1;
    candidate_slug = base_slug || '-' || suffix::TEXT;
  END LOOP;

  NEW.public_slug = candidate_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_public_slug_trigger ON profiles;
CREATE TRIGGER generate_public_slug_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION generate_public_slug();

CREATE OR REPLACE FUNCTION enforce_deal_transition()
RETURNS TRIGGER AS $$
DECLARE
  deal_escrow_status escrow_status;
  unapproved_milestones INTEGER;
  milestone_count INTEGER;
  actor_role TEXT;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  actor_role = current_setting('app.current_user_role', true);

  IF OLD.status = 'paid' THEN
    RAISE EXCEPTION 'Paid deals are immutable';
  END IF;

  IF OLD.status = 'disputed' AND actor_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only an admin can transition a disputed deal';
  END IF;

  IF OLD.status = 'initiated' THEN
    IF NEW.status <> 'active' THEN
      RAISE EXCEPTION 'Deals in initiated status can only transition to active';
    END IF;

    SELECT status INTO deal_escrow_status
    FROM escrows
    WHERE deal_id = NEW.id;

    IF deal_escrow_status IS DISTINCT FROM 'funded' THEN
      RAISE EXCEPTION 'Escrow must be funded before activating a deal';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status = 'active' THEN
    IF NEW.status NOT IN ('completed', 'disputed') THEN
      RAISE EXCEPTION 'Active deals can only transition to completed or disputed';
    END IF;

    IF NEW.status = 'completed' THEN
      SELECT COUNT(*) INTO milestone_count
      FROM milestones
      WHERE deal_id = NEW.id;

      SELECT COUNT(*) INTO unapproved_milestones
      FROM milestones
      WHERE deal_id = NEW.id
        AND status <> 'approved';

      IF milestone_count = 0 OR unapproved_milestones > 0 THEN
        RAISE EXCEPTION 'All milestones must be approved before completing a deal';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status = 'completed' AND NEW.status <> 'invoiced' THEN
    RAISE EXCEPTION 'Completed deals can only transition to invoiced';
  END IF;

  IF OLD.status = 'invoiced' AND NEW.status <> 'paid' THEN
    RAISE EXCEPTION 'Invoiced deals can only transition to paid';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_deal_transition_trigger ON collab_deals;
CREATE TRIGGER enforce_deal_transition_trigger
  BEFORE UPDATE OF status ON collab_deals
  FOR EACH ROW EXECUTE FUNCTION enforce_deal_transition();

CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

CREATE OR REPLACE FUNCTION auto_create_invoice()
RETURNS TRIGGER AS $$
DECLARE
  next_invoice_number TEXT;
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.status IS DISTINCT FROM NEW.status
    AND NEW.status = 'invoiced'
  THEN
    next_invoice_number = 'TS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('invoice_seq')::TEXT, 6, '0');

    INSERT INTO invoices (
      deal_id,
      invoice_number,
      creator_id,
      msme_id,
      amount,
      platform_fee,
      creator_payout,
      status,
      issued_at,
      due_date
    ) VALUES (
      NEW.id,
      next_invoice_number,
      NEW.creator_id,
      NEW.msme_id,
      NEW.agreed_amount,
      NEW.platform_fee,
      NEW.creator_payout,
      'draft',
      NOW(),
      CURRENT_DATE + INTERVAL '15 days'
    )
    ON CONFLICT (deal_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_invoice_trigger ON collab_deals;
CREATE TRIGGER auto_create_invoice_trigger
  AFTER UPDATE OF status ON collab_deals
  FOR EACH ROW EXECUTE FUNCTION auto_create_invoice();

DROP MATERIALIZED VIEW IF EXISTS market_rates;
CREATE MATERIALIZED VIEW market_rates AS
SELECT
  profiles.niche,
  CASE
    WHEN profiles.subscribers < 10000 THEN 'nano'
    WHEN profiles.subscribers < 100000 THEN 'micro'
    ELSE 'mid'
  END AS audience_band,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY collab_deals.agreed_amount)::DECIMAL(12,2) AS rate_p25,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY collab_deals.agreed_amount)::DECIMAL(12,2) AS rate_median,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY collab_deals.agreed_amount)::DECIMAL(12,2) AS rate_p75,
  COUNT(*)::INTEGER AS deal_count
FROM collab_deals
JOIN profiles ON profiles.id = collab_deals.creator_id
WHERE profiles.niche IS NOT NULL
  AND collab_deals.status IN ('completed', 'invoiced', 'paid')
GROUP BY profiles.niche, audience_band
HAVING COUNT(*) >= 5;

CREATE UNIQUE INDEX IF NOT EXISTS market_rates_niche_band_idx
  ON market_rates (niche, audience_band);
