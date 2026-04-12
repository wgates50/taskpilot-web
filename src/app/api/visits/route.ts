import { NextRequest, NextResponse } from 'next/server';
import { getVisitReviews, insertVisitReview, updateVisitReviewStatus, incrementPlaceCounter } from '@/lib/db';
import { verifyApiKey, verifyClient } from '@/lib/auth';

// GET /api/visits?week=2026-04-07&status=pending
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // Default to current week's Monday
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
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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
  if (!verifyClient(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, status, place_id } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    await updateVisitReviewStatus(id, status);

    // Update place scoring based on review — atomic increment.
    if (place_id) {
      const now = new Date().toISOString();
      if (status === 'visited') {
        await incrementPlaceCounter(place_id, 'times_visited', { last_visited: now });
      } else if (status === 'go-again') {
        await incrementPlaceCounter(place_id, 'times_visited', { last_visited: now, liked: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/visits error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
