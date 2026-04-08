import { sql } from '@vercel/postgres';

// ── Messages ──────────────────────────────────────────────

export interface MessageRow {
  id: string;
  task_id: string;
  blocks: unknown[];
  timestamp: string;
  is_from_user: boolean;
}

export async function insertMessage(
  id: string,
  taskId: string,
  blocks: unknown[],
  timestamp: string,
  isFromUser: boolean = false
): Promise<MessageRow> {
  const result = await sql`
    INSERT INTO messages (id, task_id, blocks, timestamp, is_from_user)
    VALUES (${id}, ${taskId}, ${JSON.stringify(blocks)}, ${timestamp}, ${isFromUser})
    RETURNING *
  `;
  return result.rows[0] as MessageRow;
}

export async function getMessages(
  taskId: string,
  limit: number = 50,
  before?: string
): Promise<MessageRow[]> {
  if (before) {
    const result = await sql`
      SELECT * FROM messages
      WHERE task_id = ${taskId} AND timestamp < ${before}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;
    return result.rows as MessageRow[];
  }
  const result = await sql`
    SELECT * FROM messages
    WHERE task_id = ${taskId}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
  return result.rows as MessageRow[];
}

export async function getLatestMessages(): Promise<MessageRow[]> {
  // Get the most recent message for each task
  const result = await sql`
    SELECT DISTINCT ON (task_id) *
    FROM messages
    WHERE is_from_user = false
    ORDER BY task_id, timestamp DESC
  `;
  return result.rows as MessageRow[];
}

// ── Pins ──────────────────────────────────────────────────

export async function getPins(): Promise<string[]> {
  const result = await sql`SELECT task_id FROM user_pins ORDER BY pinned_at`;
  return result.rows.map((r) => (r as { task_id: string }).task_id);
}

export async function togglePin(taskId: string): Promise<boolean> {
  // Check if already pinned
  const existing = await sql`SELECT task_id FROM user_pins WHERE task_id = ${taskId}`;
  if (existing.rows.length > 0) {
    await sql`DELETE FROM user_pins WHERE task_id = ${taskId}`;
    return false; // unpinned
  } else {
    await sql`INSERT INTO user_pins (task_id) VALUES (${taskId})`;
    return true; // pinned
  }
}

// ── Push Subscriptions ────────────────────────────────────

export async function savePushSubscription(sub: unknown): Promise<void> {
  const json = JSON.stringify(sub);
  // Upsert based on endpoint
  await sql`
    INSERT INTO push_subscriptions (endpoint, subscription)
    VALUES (${(sub as { endpoint: string }).endpoint}, ${json})
    ON CONFLICT (endpoint) DO UPDATE SET subscription = ${json}, updated_at = NOW()
  `;
}

export async function getPushSubscriptions(): Promise<unknown[]> {
  const result = await sql`SELECT subscription FROM push_subscriptions`;
  return result.rows.map((r) => {
    const row = r as { subscription: string | object };
    return typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
  });
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
}

// ── Unread counts ─────────────────────────────────────────

export async function getUnreadCounts(): Promise<Record<string, number>> {
  const result = await sql`
    SELECT task_id, COUNT(*) as count
    FROM messages
    WHERE is_from_user = false AND read_at IS NULL
    GROUP BY task_id
    ORDER BY task_id
  `;
  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    counts[row.task_id as string] = Number(row.count);
  }
  return counts;
}

export async function markTaskRead(taskId: string): Promise<void> {
  await sql`
    UPDATE messages SET read_at = NOW()
    WHERE task_id = ${taskId} AND is_from_user = false AND read_at IS NULL
  `;
}

// ── Profile (single source of truth for taste/preferences) ──

export async function getProfile(): Promise<Record<string, unknown> | null> {
  const result = await sql`SELECT data FROM profile WHERE id = 'main' LIMIT 1`;
  if (result.rows.length === 0) return null;
  const row = result.rows[0] as { data: Record<string, unknown> | string };
  return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
}

export async function upsertProfile(data: Record<string, unknown>): Promise<void> {
  const json = JSON.stringify(data);
  await sql`
    INSERT INTO profile (id, data) VALUES ('main', ${json})
    ON CONFLICT (id) DO UPDATE SET data = ${json}, updated_at = NOW()
  `;
}

export async function addEvidenceEntry(entry: {
  date: string;
  taskId: string;
  type: string;
  detail: string;
}): Promise<void> {
  await sql`
    INSERT INTO evidence_log (task_id, type, detail, logged_at)
    VALUES (${entry.taskId}, ${entry.type}, ${entry.detail}, ${entry.date})
  `;
}

export async function getEvidenceLog(limit: number = 50): Promise<unknown[]> {
  const result = await sql`
    SELECT * FROM evidence_log ORDER BY logged_at DESC LIMIT ${limit}
  `;
  return result.rows;
}

// ── Saved Items ──────────────────────────────────────────

export interface SavedItemRow {
  id: string;
  title: string;
  venue: string | null;
  date: string | null;
  time: string | null;
  price: string | null;
  category: string | null;
  tags: string[];
  url: string | null;
  map_url: string | null;
  booking_url: string | null;
  image_url: string | null;
  reason: string | null;
  source_task_id: string | null;
  saved_at: string;
}

export async function getSavedItems(): Promise<SavedItemRow[]> {
  const result = await sql`
    SELECT * FROM saved_items ORDER BY saved_at DESC
  `;
  return result.rows as SavedItemRow[];
}

export async function getSavedItemByTitle(title: string, venue: string | null): Promise<SavedItemRow | null> {
  const result = venue
    ? await sql`SELECT * FROM saved_items WHERE title = ${title} AND venue = ${venue} LIMIT 1`
    : await sql`SELECT * FROM saved_items WHERE title = ${title} AND venue IS NULL LIMIT 1`;
  return (result.rows[0] as SavedItemRow) || null;
}

export async function insertSavedItem(item: Omit<SavedItemRow, 'saved_at'>): Promise<SavedItemRow> {
  const result = await sql`
    INSERT INTO saved_items (id, title, venue, date, time, price, category, tags, url, map_url, booking_url, image_url, reason, source_task_id)
    VALUES (
      ${item.id}, ${item.title}, ${item.venue}, ${item.date}, ${item.time},
      ${item.price}, ${item.category}, ${JSON.stringify(item.tags || [])},
      ${item.url}, ${item.map_url}, ${item.booking_url}, ${item.image_url},
      ${item.reason}, ${item.source_task_id}
    )
    RETURNING *
  `;
  return result.rows[0] as SavedItemRow;
}

export async function deleteSavedItem(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM saved_items WHERE id = ${id}`;
  return (result.rowCount ?? 0) > 0;
}

// ── Setup ─────────────────────────────────────────────────

export async function setupDatabase(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      blocks JSONB NOT NULL DEFAULT '[]',
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_from_user BOOLEAN NOT NULL DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS user_pins (
      task_id TEXT PRIMARY KEY,
      pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      subscription JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_task_id ON messages(task_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_task_timestamp ON messages(task_id, timestamp DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(task_id) WHERE read_at IS NULL`;
  await sql`
    CREATE TABLE IF NOT EXISTS profile (
      id TEXT PRIMARY KEY DEFAULT 'main',
      data JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS evidence_log (
      id SERIAL PRIMARY KEY,
      task_id TEXT NOT NULL,
      type TEXT NOT NULL,
      detail TEXT NOT NULL,
      logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      flagged BOOLEAN NOT NULL DEFAULT FALSE
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_evidence_log_date ON evidence_log(logged_at DESC)`;
  await sql`
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
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_saved_items_date ON saved_items(saved_at DESC)`;
}
