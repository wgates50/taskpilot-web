import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyApiKey } from '@/lib/auth';
import { updatePlaceEnrichment } from '@/lib/db';
import type { PlaceRow } from '@/lib/db';

// POST /api/places/enrich-google-places
// Body: { google_api_key: string, limit?: number, dry_run?: boolean }
// Auth: Bearer TaskPilot API key
//
// Walks places where lat IS NULL OR google_place_id IS NULL, calls Google
// Places Find Place From Text for each, and writes back lat/lng, google_place_id,
// google_rating, formatted_address, price_tier. Rate-limited by the Google Places
// free tier; each call is a single round trip.
//
// Returns: { total_candidates, attempted, enriched, skipped, failures }
export async function POST(req: NextRequest) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { google_api_key?: string; limit?: number; dry_run?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const googleKey = body.google_api_key || process.env.GOOGLE_MAPS_API_KEY;
  if (!googleKey) {
    return NextResponse.json(
      { error: 'google_api_key is required in body or GOOGLE_MAPS_API_KEY env var' },
      { status: 400 }
    );
  }

  const limit = Math.min(body.limit ?? 200, 500);
  const dryRun = body.dry_run === true;

  // Find places missing Google Places data (no lat OR no google_place_id)
  const candidatesResult = await sql`
    SELECT id, name, area, category, subcategory, address, lat, lng, google_place_id, google_rating
    FROM places
    WHERE lat IS NULL OR google_place_id IS NULL
    ORDER BY name
    LIMIT ${limit}
  `;
  const candidates = candidatesResult.rows as Partial<PlaceRow>[];

  const results: {
    enriched: Array<{ id: string; name: string; fields: string[] }>;
    skipped: Array<{ id: string; name: string; reason: string }>;
    failures: Array<{ id: string; name: string; error: string }>;
  } = { enriched: [], skipped: [], failures: [] };

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      total_candidates: candidates.length,
      candidates: candidates.map(c => ({
        id: c.id,
        name: c.name,
        area: c.area,
        has_lat: c.lat != null,
        has_place_id: !!c.google_place_id,
      })),
    });
  }

  for (const place of candidates) {
    if (!place.id || !place.name) {
      results.skipped.push({
        id: place.id ?? 'unknown',
        name: place.name ?? 'unknown',
        reason: 'missing id or name',
      });
      continue;
    }

    // Build search query: "Name Area London"
    const queryParts = [place.name];
    if (place.area) queryParts.push(place.area);
    queryParts.push('London');
    const query = queryParts.join(' ');

    try {
      // Use Text Search (more forgiving than Find Place From Text for partial matches)
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=uk&key=${googleKey}`;
      const apiRes = await fetch(url);
      if (!apiRes.ok) {
        results.failures.push({
          id: place.id,
          name: place.name,
          error: `HTTP ${apiRes.status}`,
        });
        continue;
      }
      const data = await apiRes.json() as {
        status: string;
        error_message?: string;
        results?: Array<{
          place_id: string;
          name: string;
          formatted_address: string;
          geometry?: { location?: { lat: number; lng: number } };
          rating?: number;
          price_level?: number;
          types?: string[];
        }>;
      };

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        results.failures.push({
          id: place.id,
          name: place.name,
          error: `Google Places: ${data.status}${data.error_message ? ' — ' + data.error_message : ''}`,
        });
        continue;
      }

      const top = data.results[0];
      const priceTier = top.price_level != null
        ? ['free', 'budget', 'casual', 'mid-range', 'high-end'][top.price_level] ?? null
        : null;

      const updates: Parameters<typeof updatePlaceEnrichment>[1] = {
        google_place_id: top.place_id,
        address: top.formatted_address,
        enriched_at: new Date().toISOString(),
      };
      if (top.geometry?.location) {
        updates.lat = top.geometry.location.lat;
        updates.lng = top.geometry.location.lng;
      }
      if (top.rating != null) updates.google_rating = top.rating;
      if (priceTier) updates.price_tier = priceTier;

      await updatePlaceEnrichment(place.id, updates);

      results.enriched.push({
        id: place.id,
        name: place.name,
        fields: Object.keys(updates),
      });
    } catch (err) {
      results.failures.push({
        id: place.id,
        name: place.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    total_candidates: candidates.length,
    enriched_count: results.enriched.length,
    skipped_count: results.skipped.length,
    failures_count: results.failures.length,
    enriched: results.enriched,
    skipped: results.skipped,
    failures: results.failures,
  });
}
