ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verified_avg_views INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'self_reported',
  ADD COLUMN IF NOT EXISTS trust_multiplier DECIMAL(3,2) DEFAULT 0.70,
  ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS youtube_channel_url TEXT,
  ADD COLUMN IF NOT EXISTS vidiq_outlier_score DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vidiq_view_velocity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phyllo_user_id TEXT,
  ADD COLUMN IF NOT EXISTS phyllo_account_id TEXT,
  ADD COLUMN IF NOT EXISTS phyllo_status TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_youtube_channel_id_unique
  ON profiles (youtube_channel_id)
  WHERE youtube_channel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_data_source_idx ON profiles (data_source);
