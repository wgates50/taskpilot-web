import { NextRequest, NextResponse } from 'next/server';
import { getVisitReviews, getVisitReviewsHistory, getVisitPatternStats, insertVisitReview, updateVisitReviewStatus, updatePlaceScoring, getPlace } from '@/lib/db';

// GET /api/visits?week=2026-04-07&status=pending
// GET /api/visits?from=2026-03-01&to=2026-04-12 — history across weeks
// GET /api/visits?from=2026-03-01&to=2026-04-12&stats=true — aggregated pattern stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const stats = searchParams.get('stats');

    // Range query — used by activity engine for learning loop
    if (from && to) {
      if (stats === 'true') {
        const patterns = await getVisitPatternStats(from, to);
        return NextResponse.json({ patterns, from, to });
      }
      const status = searchParams.get('status') || undefined;
      const reviews = await getVisitReviewsHistory(from, to, status);
      return NextResponse.json({ reviews, from, to, count: reviews.length });
    }

    // Single-week query (original behaviour)
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const week = searchParams.get('week') || monday.toISOString().split('T')[0];
    const status = searchParams.get('status') || undefined;

    const reviews = await getVisitReviews(week, status);
    return NextResponse.json({ reviews, week });
  } catch (err) {
    console.error('GET /api/visits error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/visits — create visit review records (used by visit-review task)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body.reviews)) {
      const results = [];
      for (const review of body.reviews) {
        if (!review.review_week) continue;
        const result = await insertVisitReview(review);
        results.push(result);
      }
      return NextResponse.json({ ok: true, count: results.length }, { status: 201 });
    }

    if (!body.review_week) {
      return NextResponse.json({ error: 'review_week is required' }, { status: 400 });
    }

    const review = await insertVisitReview(body);
    return NextResponse.json({ ok: true, review }, { status: 201 });
  } catch (err) {
    console.error('POST /api/visits error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/visits — update review status (visited, skipped, go-again)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, place_id } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    await updateVisitReviewStatus(id, status);

    // Update place scoring based on review
    if (place_id) {
      const place = await getPlace(place_id);
      if (place) {
        if (status === 'visited') {
          await updatePlaceScoring(place_id, {
            times_visited: place.times_visited + 1,
            last_visited: new Date().toISOString(),
          });
        } else if (status === 'go-again') {
          await updatePlaceScoring(place_id, {
            times_visited: place.times_visited + 1,
            last_visited: new Date().toISOString(),
            liked: true,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/visits error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
