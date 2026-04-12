import { NextRequest, NextResponse } from 'next/server';
import { getSuggestions, insertSuggestion, updateSuggestionStatus, incrementPlaceCounter } from '@/lib/db';
import { verifyClient } from '@/lib/auth';

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

// POST /api/suggestions — task pushes scored suggestions, or browser persists rescore
export async function POST(req: NextRequest) {
  if (!verifyClient(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Batch insert — atomic counter increments avoid an N+1 read.
    if (Array.isArray(body.suggestions)) {
      const now = new Date().toISOString();
      const valid = body.suggestions.filter(
        (s: { place_id?: string; suggestion_date?: string; score?: number }) =>
          s.place_id && s.suggestion_date && s.score !== undefined,
      );
      const results = await Promise.all(
        valid.map(async (s: Parameters<typeof insertSuggestion>[0] & { place_id: string }) => {
          const result = await insertSuggestion(s);
          await incrementPlaceCounter(s.place_id, 'times_suggested', { last_suggested: now });
          return result;
        }),
      );
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
  if (!verifyClient(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, status, place_id } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    await updateSuggestionStatus(id, status);

    // Update place scoring based on action — atomic increment, no read-then-write race.
    if (place_id) {
      if (status === 'accepted') {
        await incrementPlaceCounter(place_id, 'times_accepted');
      } else if (status === 'dismissed') {
        await incrementPlaceCounter(place_id, 'times_dismissed');
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/suggestions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
