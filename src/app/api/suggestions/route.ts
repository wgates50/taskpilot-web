import { NextRequest, NextResponse } from 'next/server';
import { getSuggestions, getSuggestionPatternStats, insertSuggestion, updateSuggestionStatus, getPlaces, updatePlaceScoring, getPlace, insertVisitReview } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';

// GET /api/suggestions?date=2026-04-08&status=pending
// GET /api/suggestions?from=2026-03-01&to=2026-04-12&stats=true — pattern stats for learning loop
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const stats = searchParams.get('stats');

    // Range stats query — used by activity engine learning loop
    if (from && to && stats === 'true') {
      const patterns = await getSuggestionPatternStats(from, to);
      return NextResponse.json({ patterns, from, to });
    }

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

          // Auto-create a visit_review record for the suggestion date so
          // the "Went / Didn't go" prompt appears on the Planning tab.
          // The review_week is the Monday of the suggestion's week.
          try {
            const suggDate = body.suggestion_date || new Date().toISOString().split('T')[0];
            const d = new Date(suggDate);
            const dayOfWeek = d.getDay();
            const monday = new Date(d);
            monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7)); // shift to Monday
            const reviewWeek = monday.toISOString().split('T')[0];
            await insertVisitReview({
              place_id,
              review_week: reviewWeek,
            });
          } catch (reviewErr) {
            // Non-fatal — log but don't fail the accept action.
            console.error('Auto-create visit_review failed:', reviewErr);
          }
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
