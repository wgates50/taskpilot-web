import { NextRequest, NextResponse } from 'next/server';
import { getPlaces, upsertPlace, getPlacesStats, updatePlaceScoring } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';

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
        const result = await upsertPlace(place);
        results.push(result);
      }
      return NextResponse.json({ ok: true, count: results.length }, { status: 201 });
    }

    // Single upsert
    if (!body.id || !body.name) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    }

    const place = await upsertPlace(body);
    return NextResponse.json({ ok: true, place }, { status: 201 });
  } catch (err) {
    console.error('POST /api/places error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/places — update scoring metadata (used by app actions)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await updatePlaceScoring(id, updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/places error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
