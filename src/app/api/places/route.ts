import { NextRequest, NextResponse } from 'next/server';
import { getPlaces, upsertPlace, getPlacesStats, updatePlaceScoring, updatePlaceEnrichment } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';

// Normalize Notion page IDs — strip dashes to prevent duplicates
// (Notion sometimes returns "33c65a6e-536a-8133-..." and sometimes "33c65a6e536a8133...")
function normalizeId(id: string): string {
  return id.replace(/-/g, '');
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
      const results = [];
      for (const place of body.places) {
        if (!place.id || !place.name) continue;
        place.id = normalizeId(place.id);
        if (place.notion_page_id) place.notion_page_id = normalizeId(place.notion_page_id);
        const result = await upsertPlace(place);
        results.push(result);
      }
      return NextResponse.json({ ok: true, count: results.length }, { status: 201 });
    }

    // Single upsert
    if (!body.id || !body.name) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    }

    body.id = normalizeId(body.id);
    if (body.notion_page_id) body.notion_page_id = normalizeId(body.notion_page_id);
    const place = await upsertPlace(body);
    return NextResponse.json({ ok: true, place }, { status: 201 });
  } catch (err) {
    console.error('POST /api/places error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/places — update scoring OR enrichment metadata
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const rawId = body.id;
    const { id: _rawId, ...updates } = body;
    const id = rawId ? normalizeId(rawId) : null;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Enrichment fields — route to updatePlaceEnrichment
    const enrichmentKeys = new Set([
      'lat', 'lng', 'google_place_id', 'google_rating', 'address', 'price_tier',
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/places error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
