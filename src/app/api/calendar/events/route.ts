import { NextRequest, NextResponse } from 'next/server';
import { listCalendarEvents } from '@/lib/google-auth';

// GET /api/calendar/events?from=ISO&to=ISO
// Returns real events from the user's primary Google Calendar for the
// given time window. On "not connected" responds 412 with NOT_CONNECTED
// so the client can prompt the user to connect.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (!from || !to) {
      return NextResponse.json(
        { error: 'from and to are required (ISO 8601)' },
        { status: 400 },
      );
    }

    const items = await listCalendarEvents(from, to);
    return NextResponse.json({ events: items, from, to });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg === 'NOT_CONNECTED') {
      return NextResponse.json(
        { error: 'NOT_CONNECTED', detail: 'Google Calendar is not connected.' },
        { status: 412 },
      );
    }
    console.error('GET /api/calendar/events error:', msg);
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
