-- TaskPilot Database Schema
-- This file documents all tables created by setupDatabase() in db.ts.
-- Run POST /api/setup (with API key) to initialise or migrate.

-- ── Core ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_from_user BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_pins (
  task_id TEXT PRIMARY KEY,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_task_id ON messages(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_task_timestamp ON messages(task_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(task_id) WHERE read_at IS NULL;

-- ── Profile & Evidence ───────────────────────────────────

CREATE TABLE IF NOT EXISTS profile (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence_log (
  id SERIAL PRIMARY KEY,
  task_id TEXT NOT NULL,
  type TEXT NOT NULL,
  detail TEXT NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  flagged BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_evidence_log_date ON evidence_log(logged_at DESC);

-- ── Saved Items ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  venue TEXT,
  date TEXT,
  time TEXT,
  price TEXT,
  category TEXT,
  tags JSONB NOT NULL DEFAULT '[]',
  url TEXT,
  map_url TEXT,
  booking_url TEXT,
  image_url TEXT,
  reason TEXT,
  source_task_id TEXT,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_items_date ON saved_items(saved_at DESC);

-- ── Activity Engine: Places ──────────────────────────────

CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  notion_page_id TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Uncategorised',
  subcategory TEXT NOT NULL DEFAULT 'Other',
  cuisine_tags JSONB NOT NULL DEFAULT '[]',
  area TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  google_maps_url TEXT,
  website TEXT,
  google_rating NUMERIC(2,1),
  vibe_tags JSONB NOT NULL DEFAULT '[]',
  time_tags JSONB NOT NULL DEFAULT '[]',
  weather_tags JSONB NOT NULL DEFAULT '[]',
  social_tags JSONB NOT NULL DEFAULT '[]',
  day_tags JSONB NOT NULL DEFAULT '[]',
  season_tags JSONB NOT NULL DEFAULT '[]',
  price_tier TEXT,
  booking_type TEXT,
  duration TEXT,
  opening_hours JSONB,
  notes TEXT,
  times_suggested INTEGER NOT NULL DEFAULT 0,
  times_accepted INTEGER NOT NULL DEFAULT 0,
  times_dismissed INTEGER NOT NULL DEFAULT 0,
  times_visited INTEGER NOT NULL DEFAULT 0,
  last_suggested TIMESTAMPTZ,
  last_visited TIMESTAMPTZ,
  liked BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'google-maps',
  google_place_id TEXT,
  enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_area ON places(area);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_enriched ON places(enriched_at);

-- ── Activity Engine: Suggestions ─────────────────────────

CREATE TABLE IF NOT EXISTS suggestions (
  id SERIAL PRIMARY KEY,
  place_id TEXT REFERENCES places(id),
  suggestion_date DATE NOT NULL,
  suggested_for TEXT,
  score NUMERIC(5,2),
  scoring_reasons JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_date ON suggestions(suggestion_date);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);

-- ── Activity Engine: Events Cache ────────────────────────

CREATE TABLE IF NOT EXISTS events_cache (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  venue TEXT,
  date_start TIMESTAMPTZ,
  date_end TIMESTAMPTZ,
  category TEXT,
  price TEXT,
  url TEXT,
  calendar_link TEXT,
  tags JSONB NOT NULL DEFAULT '[]',
  reason TEXT,
  closing_date DATE,
  score NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'pending',
  times_suggested INTEGER NOT NULL DEFAULT 0,
  last_suggested TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events_cache(date_start);
CREATE INDEX IF NOT EXISTS idx_events_closing ON events_cache(closing_date);

-- ── User Context ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_context (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Visit Reviews ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS visit_reviews (
  id SERIAL PRIMARY KEY,
  place_id TEXT REFERENCES places(id),
  event_id TEXT,
  review_week DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_reviews_week ON visit_reviews(review_week);
