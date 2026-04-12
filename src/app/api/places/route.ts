import { NextRequest, NextResponse } from 'next/server';
import { getPlaces, upsertPlace, getPlacesStats, updatePlaceScoring, updatePlaceEnrichment, deletePlace } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';

// Normalize Notion page IDs — strip dashes to prevent duplicates
// (Notion sometimes returns "33c65a6e-536a-8133-..." and sometimes "33c65a6e536a8133...")
function normalizeId(id: string): string {
  return id.replace(/-/g, '');
}

// Resolve an incoming payload's primary id. Prefer explicit `id`, then fall back
// to `notion_page_id` — some tasks only send the Notion UUID under `notion_page_id`.
function resolveId(place: { id?: string; notion_page_id?: string }): string | null {
  const raw = place.id || place.notion_page_id;
  return raw ? normalizeId(raw) : null;
}

// GET /api/places — list/filter places (used by Planning tab + tasks)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const area = searchParams.get('area') || undefined;
    const enriched = searchParams.get('enriched');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const stats = searchParams.get('stats');

    if (stats === 'true') {
      const s = await getPlacesStats();
      return NextResponse.json(s);
    }

    const places = await getPlaces({
      category,
      area,
      enriched: enriched === 'false' ? false : undefined,
      limit,
      offset,
    });

    return NextResponse.json({ places, count: places.length });
  } catch (err) {
    console.error('GET /api/places error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/places — upsert a place (used by sync task)
export async function POST(req: NextRequest) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Support batch upsert
    if (Array.isArray(body.places)) {
      const results: unknown[] = [];
      const skipped: Array<{ index: number; reason: string; name?: string }> = [];

      for (let i = 0; i < body.places.length; i++) {
        const place = body.places[i];
        const resolvedId = resolveId(place);

        if (!resolvedId) {
          skipped.push({ index: i, reason: 'missing id and notion_page_id', name: place.name });
          continue;
        }
        if (!place.name) {
          skipped.push({ index: i, reason: 'missing name', name: place.name });
          continue;
        }

        place.id = resolvedId;
        if (place.notion_page_id) {
          place.notion_page_id = normalizeId(place.notion_page_id);
        } else {
          place.notion_page_id = resolvedId;
        }

        try {
          const result = await upsertPlace(place);
          results.push(result);
        } catch (err) {
          console.error(`upsertPlace failed for place ${i} (${place.name}):`, err);
          skipped.push({
            index: i,
            reason: `upsert error: ${err instanceof Error ? err.message : String(err)}`,
            name: place.name,
          });
        }
      }

      return NextResponse.json(
        {
          ok: true,
          count: results.length,
          received: body.places.length,
          skipped_count: skipped.length,
          skipped: skipped.slice(0, 10), // only include first 10 for brevity
        },
        { status: 201 }
      );
    }

    // Single upsert
    const singleId = resolveId(body);
    if (!singleId) {
      return NextResponse.json(
        { error: 'id or notion_page_id is required' },
        { status: 400 }
      );
    }
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    body.id = singleId;
    if (body.notion_page_id) {
      body.notion_page_id = normalizeId(body.notion_page_id);
    } else {
      body.notion_page_id = singleId;
    }
    const place = await upsertPlace(body);
    return NextResponse.json({ ok: true, place }, { status: 201 });
  } catch (err) {
    console.error('POST /api/places error:', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// DELETE /api/places?id=<id> — remove a place row (used for cleanup of
// bad/test rows). Foreign keys in suggestions/visit_reviews are nulled
// out inside deletePlace() so the delete never trips an FK constraint.
export async function DELETE(req: NextRequest) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get('id');
    if (!rawId) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }
    // We intentionally do NOT normalize here — callers may need to delete a
    // malformed row by its exact id.
    const removed = await deletePlace(rawId);
    return NextResponse.json({ ok: true, id: rawId, removed });
  } catch (err) {
    console.error('DELETE /api/places error:', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// PATCH /api/places — update scoring OR enrichment metadata
export async function PATCH(req: NextRequest) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const rawId = body.id || body.notion_page_id;
    const { id: _rawId, notion_page_id: _rawNotionId, ...updates } = body;
    const id = rawId ? normalizeId(rawId) : null;

    if (!id) {
      return NextResponse.json(
        { error: 'id or notion_page_id is required' },
        { status: 400 }
      );
    }

    // Enrichment fields — route to updatePlaceEnrichment
    const enrichmentKeys = new Set([
      'lat', 'lng', 'google_place_id', 'google_rating', 'address', 'area', 'price_tier',
      'vibe_tags', 'weather_tags', 'social_tags', 'day_tags', 'time_tags', 'season_tags',
      'duration', 'enriched_at',
    ]);
    // Scoring fields — route to updatePlaceScoring
    const scoringKeys = new Set([
      'times_suggested', 'times_accepted', 'times_dismissed', 'times_visited',
      'last_suggested', 'last_visited', 'liked',
    ]);

    const enrichmentUpdates: Record<string, unknown> = {};
    const scoringUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (enrichmentKeys.has(key)) enrichmentUpdates[key] = value;
      else if (scoringKeys.has(key)) scoringUpdates[key] = value;
    }

    if (Object.keys(enrichmentUpdates).length > 0) {
      await updatePlaceEnrichment(id, enrichmentUpdates as Parameters<typeof updatePlaceEnrichment>[1]);
    }
    if (Object.keys(scoringUpdates).length > 0) {
      await updatePlaceScoring(id, scoringUpdates as Parameters<typeof updatePlaceScoring>[1]);
    }

    return NextResponse.json({
      ok: true,
      updated: {
        enrichment: Object.keys(enrichmentUpdates),
        scoring: Object.keys(scoringUpdates),
      },
    });
  } catch (err) {
    console.error('PATCH /api/places error:', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
