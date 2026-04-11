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

// ── Places ────────────────────────────────────────────────

export interface PlaceRow {
  id: string;
  notion_page_id: string | null;
  name: string;
  category: string;
  subcategory: string;
  cuisine_tags: string[];
  area: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  google_maps_url: string | null;
  website: string | null;
  google_rating: number | null;
  vibe_tags: string[];
  time_tags: string[];
  weather_tags: string[];
  social_tags: string[];
  day_tags: string[];
  season_tags: string[];
  price_tier: string | null;
  booking_type: string | null;
  duration: string | null;
  opening_hours: unknown;
  notes: string | null;
  times_suggested: number;
  times_accepted: number;
  times_dismissed: number;
  times_visited: number;
  last_suggested: string | null;
  last_visited: string | null;
  liked: boolean;
  source: string;
  google_place_id: string | null;
  enriched_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getPlaces(filters?: {
  category?: string;
  area?: string;
  enriched?: boolean;
  limit?: number;
  offset?: number;
}): Promise<PlaceRow[]> {
  const limit = filters?.limit || 100;
  const offset = filters?.offset || 0;

  if (filters?.category) {
    const result = await sql`
      SELECT * FROM places WHERE category = ${filters.category}
      ORDER BY name LIMIT ${limit} OFFSET ${offset}
    `;
    return result.rows as PlaceRow[];
  }
  if (filters?.area) {
    const result = await sql`
      SELECT * FROM places WHERE area = ${filters.area}
      ORDER BY name LIMIT ${limit} OFFSET ${offset}
    `;
    return result.rows as PlaceRow[];
  }
  if (filters?.enriched === false) {
    const result = await sql`
      SELECT * FROM places WHERE enriched_at IS NULL
      ORDER BY name LIMIT ${limit} OFFSET ${offset}
    `;
    return result.rows as PlaceRow[];
  }
  const result = await sql`
    SELECT * FROM places ORDER BY name LIMIT ${limit} OFFSET ${offset}
  `;
  return result.rows as PlaceRow[];
}

export async function getPlace(id: string): Promise<PlaceRow | null> {
  const result = await sql`SELECT * FROM places WHERE id = ${id} LIMIT 1`;
  return (result.rows[0] as PlaceRow) || null;
}

export async function upsertPlace(place: Partial<PlaceRow> & { id: string; name: string }): Promise<PlaceRow> {
  const result = await sql`
    INSERT INTO places (
      id, notion_page_id, name, category, subcategory, cuisine_tags,
      area, address, lat, lng, google_maps_url, website, google_rating,
      vibe_tags, time_tags, weather_tags, social_tags, day_tags, season_tags,
      price_tier, booking_type, duration, opening_hours, notes,
      times_suggested, times_accepted, times_dismissed, times_visited,
      last_suggested, last_visited, liked, source, google_place_id, enriched_at
    ) VALUES (
      ${place.id}, ${place.notion_page_id || null}, ${place.name},
      ${place.category || 'Uncategorised'}, ${place.subcategory || 'Other'},
      ${JSON.stringify(place.cuisine_tags || [])},
      ${place.area || null}, ${place.address || null},
      ${place.lat || null}, ${place.lng || null},
      ${place.google_maps_url || null}, ${place.website || null},
      ${place.google_rating || null},
      ${JSON.stringify(place.vibe_tags || [])},
      ${JSON.stringify(place.time_tags || [])},
      ${JSON.stringify(place.weather_tags || [])},
      ${JSON.stringify(place.social_tags || [])},
      ${JSON.stringify(place.day_tags || [])},
      ${JSON.stringify(place.season_tags || [])},
      ${place.price_tier || null}, ${place.booking_type || null},
      ${place.duration || null},
      ${place.opening_hours ? JSON.stringify(place.opening_hours) : null},
      ${place.notes || null},
      ${place.times_suggested || 0}, ${place.times_accepted || 0},
      ${place.times_dismissed || 0}, ${place.times_visited || 0},
      ${place.last_suggested || null}, ${place.last_visited || null},
      ${place.liked || false}, ${place.source || 'google-maps'},
      ${place.google_place_id || null}, ${place.enriched_at || null}
    )
    ON CONFLICT (id) DO UPDATE SET
      notion_page_id = COALESCE(EXCLUDED.notion_page_id, places.notion_page_id),
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      subcategory = EXCLUDED.subcategory,
      cuisine_tags = EXCLUDED.cuisine_tags,
      area = COALESCE(EXCLUDED.area, places.area),
      address = COALESCE(EXCLUDED.address, places.address),
      lat = COALESCE(EXCLUDED.lat, places.lat),
      lng = COALESCE(EXCLUDED.lng, places.lng),
      google_maps_url = COALESCE(EXCLUDED.google_maps_url, places.google_maps_url),
      website = COALESCE(EXCLUDED.website, places.website),
      google_rating = COALESCE(EXCLUDED.google_rating, places.google_rating),
      vibe_tags = EXCLUDED.vibe_tags,
      time_tags = EXCLUDED.time_tags,
      weather_tags = EXCLUDED.weather_tags,
      social_tags = EXCLUDED.social_tags,
      day_tags = EXCLUDED.day_tags,
      season_tags = EXCLUDED.season_tags,
      price_tier = COALESCE(EXCLUDED.price_tier, places.price_tier),
      booking_type = COALESCE(EXCLUDED.booking_type, places.booking_type),
      duration = COALESCE(EXCLUDED.duration, places.duration),
      opening_hours = COALESCE(EXCLUDED.opening_hours, places.opening_hours),
      notes = COALESCE(EXCLUDED.notes, places.notes),
      source = EXCLUDED.source,
      google_place_id = COALESCE(EXCLUDED.google_place_id, places.google_place_id),
      enriched_at = COALESCE(EXCLUDED.enriched_at, places.enriched_at),
      updated_at = NOW()
    RETURNING *
  `;
  return result.rows[0] as PlaceRow;
}

export async function updatePlaceScoring(
  id: string,
  updates: Partial<Pick<PlaceRow, 'times_suggested' | 'times_accepted' | 'times_dismissed' | 'times_visited' | 'last_suggested' | 'last_visited' | 'liked'>>
): Promise<void> {
  // Single query: use COALESCE to conditionally update only provided fields
  // @vercel/postgres tagged templates require known placeholders, so we pass all
  // fields and use COALESCE to keep the existing value when null is passed.
  const ts = updates.times_suggested ?? null;
  const ta = updates.times_accepted ?? null;
  const td = updates.times_dismissed ?? null;
  const tv = updates.times_visited ?? null;
  const ls = updates.last_suggested ?? null;
  const lv = updates.last_visited ?? null;
  const lk = updates.liked ?? null;

  await sql`
    UPDATE places SET
      times_suggested = COALESCE(${ts}::int, times_suggested),
      times_accepted  = COALESCE(${ta}::int, times_accepted),
      times_dismissed = COALESCE(${td}::int, times_dismissed),
      times_visited   = COALESCE(${tv}::int, times_visited),
      last_suggested  = COALESCE(${ls}::timestamptz, last_suggested),
      last_visited    = COALESCE(${lv}::timestamptz, last_visited),
      liked           = COALESCE(${lk}::bool, liked),
      updated_at      = NOW()
    WHERE id = ${id}
  `;
}

export async function updatePlaceEnrichment(
  id: string,
  updates: Partial<Pick<PlaceRow,
    'lat' | 'lng' | 'google_place_id' | 'google_rating' | 'address' | 'price_tier' |
    'vibe_tags' | 'weather_tags' | 'social_tags' | 'day_tags' | 'time_tags' | 'season_tags' |
    'duration' | 'enriched_at'
  >>
): Promise<void> {
  // Single query with COALESCE — only updates fields that are explicitly provided
  const lat = updates.lat ?? null;
  const lng = updates.lng ?? null;
  const gpid = updates.google_place_id ?? null;
  const grating = updates.google_rating ?? null;
  const addr = updates.address ?? null;
  const ptier = updates.price_tier ?? null;
  const vtags = updates.vibe_tags ? JSON.stringify(updates.vibe_tags) : null;
  const wtags = updates.weather_tags ? JSON.stringify(updates.weather_tags) : null;
  const stags = updates.social_tags ? JSON.stringify(updates.social_tags) : null;
  const dtags = updates.day_tags ? JSON.stringify(updates.day_tags) : null;
  const ttags = updates.time_tags ? JSON.stringify(updates.time_tags) : null;
  const setags = updates.season_tags ? JSON.stringify(updates.season_tags) : null;
  const dur = updates.duration ?? null;
  const eat = updates.enriched_at ?? null;

  await sql`
    UPDATE places SET
      lat             = COALESCE(${lat}::double precision, lat),
      lng             = COALESCE(${lng}::double precision, lng),
      google_place_id = COALESCE(${gpid}::text, google_place_id),
      google_rating   = COALESCE(${grating}::numeric, google_rating),
      address         = COALESCE(${addr}::text, address),
      price_tier      = COALESCE(${ptier}::text, price_tier),
      vibe_tags       = COALESCE(${vtags}::jsonb, vibe_tags),
      weather_tags    = COALESCE(${wtags}::jsonb, weather_tags),
      social_tags     = COALESCE(${stags}::jsonb, social_tags),
      day_tags        = COALESCE(${dtags}::jsonb, day_tags),
      time_tags       = COALESCE(${ttags}::jsonb, time_tags),
      season_tags     = COALESCE(${setags}::jsonb, season_tags),
      duration        = COALESCE(${dur}::text, duration),
      enriched_at     = COALESCE(${eat}::timestamptz, enriched_at),
      updated_at      = NOW()
    WHERE id = ${id}
  `;
}

export async function getPlacesCount(): Promise<number> {
  const result = await sql`SELECT COUNT(*) as count FROM places`;
  return Number(result.rows[0].count);
}

// Delete a place by id. Repoints child rows in suggestions/visit_reviews to null
// first so the foreign-key constraint doesn't block the delete. Returns whether
// a row was actually removed.
export async function deletePlace(id: string): Promise<boolean> {
  await sql`UPDATE suggestions  SET place_id = NULL WHERE place_id = ${id}`;
  await sql`UPDATE visit_reviews SET place_id = NULL WHERE place_id = ${id}`;
  const result = await sql`DELETE FROM places WHERE id = ${id}`;
  return (result.rowCount ?? 0) > 0;
}

export async function getPlacesStats(): Promise<{
  total: number;
  enriched: number;
  visited: number;
  liked: number;
  byCategory: Record<string, number>;
}> {
  const total = await sql`SELECT COUNT(*) as c FROM places`;
  const enriched = await sql`SELECT COUNT(*) as c FROM places WHERE enriched_at IS NOT NULL`;
  const visited = await sql`SELECT COUNT(*) as c FROM places WHERE times_visited > 0`;
  const liked = await sql`SELECT COUNT(*) as c FROM places WHERE liked = true`;
  const cats = await sql`SELECT category, COUNT(*) as c FROM places GROUP BY category ORDER BY c DESC`;

  const byCategory: Record<string, number> = {};
  for (const row of cats.rows) {
    byCategory[row.category as string] = Number(row.c);
  }

  return {
    total: Number(total.rows[0].c),
    enriched: Number(enriched.rows[0].c),
    visited: Number(visited.rows[0].c),
    liked: Number(liked.rows[0].c),
    byCategory,
  };
}

// ── Suggestions ───────────────────────────────────────────

export interface SuggestionRow {
  id: number;
  place_id: string;
  suggestion_date: string;
  suggested_for: string | null;
  score: number;
  scoring_reasons: unknown;
  status: string;
  created_at: string;
}

export async function insertSuggestion(s: {
  place_id: string;
  suggestion_date: string;
  suggested_for?: string;
  score: number;
  scoring_reasons?: unknown;
}): Promise<SuggestionRow> {
  const result = await sql`
    INSERT INTO suggestions (place_id, suggestion_date, suggested_for, score, scoring_reasons)
    VALUES (${s.place_id}, ${s.suggestion_date}, ${s.suggested_for || null}, ${s.score}, ${s.scoring_reasons ? JSON.stringify(s.scoring_reasons) : '{}'})
    RETURNING *
  `;
  return result.rows[0] as SuggestionRow;
}

export async function getSuggestions(date: string, status?: string): Promise<(SuggestionRow & PlaceRow)[]> {
  if (status) {
    const result = await sql`
      SELECT s.*, p.name, p.category, p.subcategory, p.area, p.address,
             p.lat, p.lng, p.google_maps_url, p.website, p.google_rating,
             p.vibe_tags, p.time_tags, p.weather_tags, p.social_tags,
             p.price_tier, p.booking_type, p.duration, p.notes,
             p.times_visited, p.liked, p.cuisine_tags
      FROM suggestions s
      JOIN places p ON s.place_id = p.id
      WHERE s.suggestion_date = ${date} AND s.status = ${status}
      ORDER BY s.score DESC
    `;
    return result.rows as (SuggestionRow & PlaceRow)[];
  }
  const result = await sql`
    SELECT s.*, p.name, p.category, p.subcategory, p.area, p.address,
           p.lat, p.lng, p.google_maps_url, p.website, p.google_rating,
           p.vibe_tags, p.time_tags, p.weather_tags, p.social_tags,
           p.price_tier, p.booking_type, p.duration, p.notes,
           p.times_visited, p.liked, p.cuisine_tags
    FROM suggestions s
    JOIN places p ON s.place_id = p.id
    WHERE s.suggestion_date = ${date}
    ORDER BY s.score DESC
  `;
  return result.rows as (SuggestionRow & PlaceRow)[];
}

export async function updateSuggestionStatus(id: number, status: string): Promise<void> {
  await sql`UPDATE suggestions SET status = ${status} WHERE id = ${id}`;
}

// ── Events Cache ──────────────────────────────────────────

export interface EventCacheRow {
  id: string;
  title: string;
  venue: string | null;
  date_start: string;
  date_end: string | null;
  category: string | null;
  price: string | null;
  url: string | null;
  calendar_link: string | null;
  tags: string[];
  reason: string | null;
  closing_date: string | null;
  score: number | null;
  status: string;
  lat: number | null;
  lng: number | null;
  times_suggested: number;
  last_suggested: string | null;
  created_at: string;
  updated_at: string;
}

export async function upsertEvent(event: Partial<EventCacheRow> & { id: string; title: string }): Promise<EventCacheRow> {
  const result = await sql`
    INSERT INTO events_cache (
      id, title, venue, date_start, date_end, category, price, url,
      calendar_link, tags, reason, closing_date, score, status,
      lat, lng, times_suggested, last_suggested
    ) VALUES (
      ${event.id}, ${event.title}, ${event.venue || null},
      ${event.date_start || new Date().toISOString()}, ${event.date_end || null},
      ${event.category || null}, ${event.price || null}, ${event.url || null},
      ${event.calendar_link || null}, ${JSON.stringify(event.tags || [])},
      ${event.reason || null}, ${event.closing_date || null},
      ${event.score || null}, ${event.status || 'pending'},
      ${event.lat ?? null}, ${event.lng ?? null},
      ${event.times_suggested || 0}, ${event.last_suggested || null}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      venue = COALESCE(EXCLUDED.venue, events_cache.venue),
      date_start = EXCLUDED.date_start,
      date_end = COALESCE(EXCLUDED.date_end, events_cache.date_end),
      category = COALESCE(EXCLUDED.category, events_cache.category),
      price = COALESCE(EXCLUDED.price, events_cache.price),
      url = COALESCE(EXCLUDED.url, events_cache.url),
      calendar_link = COALESCE(EXCLUDED.calendar_link, events_cache.calendar_link),
      tags = EXCLUDED.tags,
      reason = COALESCE(EXCLUDED.reason, events_cache.reason),
      closing_date = COALESCE(EXCLUDED.closing_date, events_cache.closing_date),
      score = COALESCE(EXCLUDED.score, events_cache.score),
      lat = COALESCE(EXCLUDED.lat, events_cache.lat),
      lng = COALESCE(EXCLUDED.lng, events_cache.lng),
      updated_at = NOW()
    RETURNING *
  `;
  return result.rows[0] as EventCacheRow;
}

export async function getEvents(dateFrom: string, dateTo: string, status?: string): Promise<EventCacheRow[]> {
  if (status) {
    const result = await sql`
      SELECT * FROM events_cache
      WHERE date_start >= ${dateFrom} AND date_start <= ${dateTo} AND status = ${status}
      ORDER BY score DESC NULLS LAST, date_start ASC
    `;
    return result.rows as EventCacheRow[];
  }
  const result = await sql`
    SELECT * FROM events_cache
    WHERE date_start >= ${dateFrom} AND date_start <= ${dateTo}
    ORDER BY score DESC NULLS LAST, date_start ASC
  `;
  return result.rows as EventCacheRow[];
}

export async function updateEventStatus(id: string, status: string): Promise<void> {
  await sql`UPDATE events_cache SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
}

// ── User Context ──────────────────────────────────────────

export async function getUserContext(key: string): Promise<unknown | null> {
  const result = await sql`SELECT value FROM user_context WHERE key = ${key} LIMIT 1`;
  if (result.rows.length === 0) return null;
  const row = result.rows[0] as { value: unknown };
  return typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
}

export async function setUserContext(key: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value);
  await sql`
    INSERT INTO user_context (key, value) VALUES (${key}, ${json})
    ON CONFLICT (key) DO UPDATE SET value = ${json}, updated_at = NOW()
  `;
}

export async function getAllUserContext(): Promise<Record<string, unknown>> {
  const result = await sql`SELECT key, value FROM user_context`;
  const ctx: Record<string, unknown> = {};
  for (const row of result.rows) {
    const r = row as { key: string; value: unknown };
    ctx[r.key] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
  }
  return ctx;
}

// ── Visit Reviews ─────────────────────────────────────────

export interface VisitReviewRow {
  id: number;
  place_id: string | null;
  event_id: string | null;
  review_week: string;
  status: string;
  reviewed_at: string | null;
  created_at: string;
}

export async function insertVisitReview(review: {
  place_id?: string;
  event_id?: string;
  review_week: string;
}): Promise<VisitReviewRow> {
  const result = await sql`
    INSERT INTO visit_reviews (place_id, event_id, review_week)
    VALUES (${review.place_id || null}, ${review.event_id || null}, ${review.review_week})
    RETURNING *
  `;
  return result.rows[0] as VisitReviewRow;
}

export async function getVisitReviews(week: string, status?: string): Promise<(VisitReviewRow & { place_name?: string })[]> {
  if (status) {
    const result = await sql`
      SELECT vr.*, p.name as place_name, p.category as place_category, p.area as place_area
      FROM visit_reviews vr
      LEFT JOIN places p ON vr.place_id = p.id
      WHERE vr.review_week = ${week} AND vr.status = ${status}
      ORDER BY vr.created_at DESC
    `;
    return result.rows as (VisitReviewRow & { place_name?: string })[];
  }
  const result = await sql`
    SELECT vr.*, p.name as place_name, p.category as place_category, p.area as place_area
    FROM visit_reviews vr
    LEFT JOIN places p ON vr.place_id = p.id
    WHERE vr.review_week = ${week}
    ORDER BY vr.created_at DESC
  `;
  return result.rows as (VisitReviewRow & { place_name?: string })[];
}

export async function updateVisitReviewStatus(id: number, status: string): Promise<void> {
  await sql`UPDATE visit_reviews SET status = ${status}, reviewed_at = NOW() WHERE id = ${id}`;
}

// ── Setup ─────────────────────────────────────────────────

export async function setupDatabase(): Promise<void> {
  // --- Existing tables ---
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

  // --- Activity Engine tables ---
  await sql`
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
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_places_area ON places(area)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_places_category ON places(category)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_places_enriched ON places(enriched_at)`;

  await sql`
    CREATE TABLE IF NOT EXISTS suggestions (
      id SERIAL PRIMARY KEY,
      place_id TEXT REFERENCES places(id),
      suggestion_date DATE NOT NULL,
      suggested_for TEXT,
      score NUMERIC(5,2),
      scoring_reasons JSONB NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_suggestions_date ON suggestions(suggestion_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status)`;

  await sql`
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
      lat NUMERIC,
      lng NUMERIC,
      times_suggested INTEGER NOT NULL DEFAULT 0,
      last_suggested TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Migrate existing deployments that already have an events_cache table
  // without lat/lng columns.
  await sql`ALTER TABLE events_cache ADD COLUMN IF NOT EXISTS lat NUMERIC`;
  await sql`ALTER TABLE events_cache ADD COLUMN IF NOT EXISTS lng NUMERIC`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_date ON events_cache(date_start)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_closing ON events_cache(closing_date)`;

  await sql`
    CREATE TABLE IF NOT EXISTS user_context (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Seed defaults if empty
  await sql`
    INSERT INTO user_context (key, value) VALUES ('location', '{"area": "Shoreditch", "lat": 51.5235, "lng": -0.0775}')
    ON CONFLICT (key) DO NOTHING
  `;
  await sql`
    INSERT INTO user_context (key, value) VALUES ('companions', '{"mode": "solo", "detail": null}')
    ON CONFLICT (key) DO NOTHING
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS visit_reviews (
      id SERIAL PRIMARY KEY,
      place_id TEXT REFERENCES places(id),
      event_id TEXT,
      review_week DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_visit_reviews_week ON visit_reviews(review_week)`;
}
