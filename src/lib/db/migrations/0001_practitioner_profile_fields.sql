ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS views_72h INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS content_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS content_purity TEXT DEFAULT 'pure'
    CHECK (content_purity IN ('pure','regional','mixed')),
  ADD COLUMN IF NOT EXISTS secondary_niche TEXT,
  ADD COLUMN IF NOT EXISTS content_mix_ratio TEXT,
  ADD COLUMN IF NOT EXISTS sponsorship_readiness DECIMAL(3,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS accepts_sponsorships BOOLEAN DEFAULT true;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS influencer_tier TEXT GENERATED ALWAYS AS (
    CASE
      WHEN avg_views < 10000   THEN 'nano'
      WHEN avg_views < 50000   THEN 'micro'
      WHEN avg_views < 200000  THEN 'mid'
      WHEN avg_views < 1000000 THEN 'macro'
      ELSE 'mega'
    END
  ) STORED;
