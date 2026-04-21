import { NextResponse } from 'next/server';
import { getBlacklistedVenues } from '@/lib/db';

// GET /api/venue-status/blacklist — all permanently closed venues
export async function GET() {
  try {
    const venues = await getBlacklistedVenues();
    return NextResponse.json({
      venues,
      count: venues.length,
      description: 'Permanently closed venues — never suggest these',
    });
  } catch (err) {
    console.error('GET /api/venue-status/blacklist error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
