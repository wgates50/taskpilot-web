import { NextRequest, NextResponse } from 'next/server';
import { upsertVenueStatus, getVenueStatus, getAllVenueStatuses } from '@/lib/db';
import { verifyClient } from '@/lib/auth';

// GET /api/venue-status?venue=X — check a specific venue, or list all
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const venueName = searchParams.get('venue');

    if (venueName) {
      const venue = await getVenueStatus(venueName);
      if (!venue) {
        return NextResponse.json({ venue: null, status: 'unknown' });
      }
      return NextResponse.json({ venue });
    }

    const venues = await getAllVenueStatuses();
    return NextResponse.json({ venues, count: venues.length });
  } catch (err) {
    console.error('GET /api/venue-status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/venue-status — update venue status
export async function POST(req: NextRequest) {
  if (!verifyClient(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.venue_name || !body.status) {
      return NextResponse.json(
        { error: 'venue_name and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['open', 'permanently_closed', 'seasonal', 'temporarily_closed'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const venue = await upsertVenueStatus({
      venue_name: body.venue_name,
      status: body.status,
      operating_days: body.operating_days,
      notes: body.notes,
    });

    return NextResponse.json({ ok: true, venue }, { status: 201 });
  } catch (err) {
    console.error('POST /api/venue-status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
