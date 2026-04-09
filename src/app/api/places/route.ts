import { NextRequest, NextResponse } from 'next/server';
import { getPlaces, upsertPlace, getPlacesStats, updatePlaceScoring, updatePlaceEnrichment } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';

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
