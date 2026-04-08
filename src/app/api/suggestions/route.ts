import { NextRequest, NextResponse } from 'next/server';
import { getSuggestions, insertSuggestion, updateSuggestionStatus, getPlaces, updatePlaceScoring, getPlace } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';

// GET /api/suggestions?date=2026-04-08&status=pending
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const status = searchParams.get('status') || undefined;

    const suggestions = await getSuggestions(date, status);
    return NextResponse.json({ suggestions, date });
  } catch (err) {
    console.error('GET /api/suggestions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/suggestions — task pushes scored suggestions
export async function POST(req: NextRequest) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Batch insert
    if (Array.isArray(body.suggestions)) {
      const results = [];
      for (const s of body.suggestions) {
        if (!s.place_id || !s.suggestion_date || s.score === undefined) continue;
        const result = await insertSuggestion(s);
        // Update place times_suggested
        const place = await getPlace(s.place_id);
        if (place) {
          await updatePlaceScoring(s.place_id, {
            times_suggested: place.times_suggested + 1,
            last_suggested: new Date().toISOString(),
          });
        }
        results.push(result);
      }
      return NextResponse.json({ ok: true, count: results.length }, { status: 201 });
    }

    // Single insert
    if (!body.place_id || !body.suggestion_date || body.score === undefined) {
      return NextResponse.json({ error: 'place_id, suggestion_date, and score are required' }, { status: 400 });
    }

    const suggestion = await insertSuggestion(body);
    return NextResponse.json({ ok: true, suggestion }, { status: 201 });
  } catch (err) {
    console.error('POST /api/suggestions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/suggestions — update status (accept, dismiss, reschedule)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, place_id } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    await updateSuggestionStatus(id, status);

    // Update place scoring based on action
    if (place_id) {
      const place = await getPlace(place_id);
      if (place) {
        if (status === 'accepted') {
          await updatePlaceScoring(place_id, { times_accepted: place.times_accepted + 1 });
        } else if (status === 'dismissed') {
          await updatePlaceScoring(place_id, { times_dismissed: place.times_dismissed + 1 });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/suggestions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
