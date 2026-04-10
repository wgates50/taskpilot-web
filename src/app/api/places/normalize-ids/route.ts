import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyApiKey } from '@/lib/auth';

// POST /api/places/normalize-ids
// One-shot cleanup: merge dashed-uuid places into their undashed counterparts.
//
// Context: earlier syncs wrote rows with dashed Notion UUIDs (33c65a6e-536a-...)
// while newer code normalizes to undashed (33c65a6e536a...). This produced
// duplicate rows for many places. Route normalizes by:
//   1. For each dashed row, compute undashed id.
//   2. If undashed row exists: merge enrichment/scoring from whichever is
//      richer, then delete dashed row.
//   3. If undashed row does NOT exist: rename dashed id → undashed in place.
//
// Gated by API key. Idempotent.
export async function POST(req: NextRequest) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Load every dashed-id row
    const dashedRows = (await sql`
      SELECT * FROM places WHERE id LIKE '%-%'
    `).rows;

    let merged = 0;
    let renamed = 0;
    const errors: Array<{ id: string; name: string; error: string }> = [];

    for (const row of dashedRows) {
      const dashedId = row.id as string;
      const undashedId = dashedId.replace(/-/g, '');
      const name = row.name as string;

      try {
        // Is there an undashed counterpart?
        const existing = (await sql`
          SELECT * FROM places WHERE id = ${undashedId} LIMIT 1
        `).rows[0];

        if (existing) {
          // Both rows present — repoint FK children onto the undashed id
          // before we touch either row. Both ids are valid at this moment
          // so suggestions_place_id_fkey / visit_reviews_place_id_fkey hold.
          await sql`UPDATE suggestions  SET place_id = ${undashedId} WHERE place_id = ${dashedId}`;
          await sql`UPDATE visit_reviews SET place_id = ${undashedId} WHERE place_id = ${dashedId}`;
        }

        if (existing) {
          // MERGE: pull any field from dashed row that the undashed row lacks.
          // Addresses the case where sync populated dashed row first and
          // enrichment went into the undashed twin (or vice versa).
          await sql`
            UPDATE places SET
              notion_page_id = COALESCE(places.notion_page_id, ${row.notion_page_id ?? null}),
              area           = COALESCE(places.area, ${row.area ?? null}),
              address        = COALESCE(places.address, ${row.address ?? null}),
              lat            = COALESCE(places.lat, ${row.lat ?? null}),
              lng            = COALESCE(places.lng, ${row.lng ?? null}),
              google_maps_url = COALESCE(places.google_maps_url, ${row.google_maps_url ?? null}),
              website        = COALESCE(places.website, ${row.website ?? null}),
              google_rating  = COALESCE(places.google_rating, ${row.google_rating ?? null}),
              price_tier     = COALESCE(places.price_tier, ${row.price_tier ?? null}),
              booking_type   = COALESCE(places.booking_type, ${row.booking_type ?? null}),
              duration       = COALESCE(places.duration, ${row.duration ?? null}),
              notes          = COALESCE(places.notes, ${row.notes ?? null}),
              google_place_id = COALESCE(places.google_place_id, ${row.google_place_id ?? null}),
              enriched_at    = COALESCE(places.enriched_at, ${row.enriched_at ?? null}),
              times_suggested = GREATEST(places.times_suggested, ${row.times_suggested ?? 0}),
              times_accepted  = GREATEST(places.times_accepted,  ${row.times_accepted ?? 0}),
              times_dismissed = GREATEST(places.times_dismissed, ${row.times_dismissed ?? 0}),
              times_visited   = GREATEST(places.times_visited,   ${row.times_visited ?? 0}),
              last_suggested  = COALESCE(places.last_suggested, ${row.last_suggested ?? null}),
              last_visited    = COALESCE(places.last_visited, ${row.last_visited ?? null}),
              liked           = places.liked OR ${row.liked ?? false},
              updated_at      = NOW()
            WHERE id = ${undashedId}
          `;
          // Now safe to delete the dashed row
          await sql`DELETE FROM places WHERE id = ${dashedId}`;
          merged += 1;
        } else {
          // No counterpart — copy row to undashed id, repoint FK children,
          // then delete the dashed row.
          // INSERT ... SELECT copies every column except id (which we override).
          await sql`
            INSERT INTO places (
              id, notion_page_id, name, category, subcategory, cuisine_tags,
              area, address, lat, lng, google_maps_url, website, google_rating,
              vibe_tags, time_tags, weather_tags, social_tags, day_tags, season_tags,
              price_tier, booking_type, duration, opening_hours, notes,
              times_suggested, times_accepted, times_dismissed, times_visited,
              last_suggested, last_visited, liked, source, google_place_id, enriched_at,
              created_at, updated_at
            )
            SELECT
              ${undashedId}, notion_page_id, name, category, subcategory, cuisine_tags,
              area, address, lat, lng, google_maps_url, website, google_rating,
              vibe_tags, time_tags, weather_tags, social_tags, day_tags, season_tags,
              price_tier, booking_type, duration, opening_hours, notes,
              times_suggested, times_accepted, times_dismissed, times_visited,
              last_suggested, last_visited, liked, source, google_place_id, enriched_at,
              created_at, NOW()
            FROM places WHERE id = ${dashedId}
          `;
          await sql`UPDATE suggestions  SET place_id = ${undashedId} WHERE place_id = ${dashedId}`;
          await sql`UPDATE visit_reviews SET place_id = ${undashedId} WHERE place_id = ${dashedId}`;
          await sql`DELETE FROM places WHERE id = ${dashedId}`;
          renamed += 1;
        }
      } catch (err) {
        errors.push({
          id: dashedId,
          name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const remainingDashed = (await sql`SELECT COUNT(*) AS c FROM places WHERE id LIKE '%-%'`).rows[0].c;
    const total = (await sql`SELECT COUNT(*) AS c FROM places`).rows[0].c;

    return NextResponse.json({
      ok: true,
      dashed_processed: dashedRows.length,
      merged,
      renamed,
      errors: errors.slice(0, 10),
      error_count: errors.length,
      remaining_dashed: Number(remainingDashed),
      total_places: Number(total),
    });
  } catch (err) {
    console.error('POST /api/places/normalize-ids error:', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
