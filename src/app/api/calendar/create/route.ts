import { NextRequest, NextResponse } from 'next/server';
import { createCalendarEvent, type CalendarEventInput } from '@/lib/google-auth';

// POST /api/calendar/create
// Body: {
//   summary: string,
//   location?: string,
//   description?: string,
//   start: { dateTime?: string, date?: string, timeZone?: string },
//   end:   { dateTime?: string, date?: string, timeZone?: string }
// }
//
// Returns: { ok: true, event: { id, htmlLink, status, summary } }
// On "not connected", returns 412 with { error: 'NOT_CONNECTED' } so the
// client can prompt the user to connect Google Calendar first.
//
// Called by PlanningScreen's handleAction when the user clicks
// "📅 Calendar" on a suggestion or bonus pick. Inserts the event directly
// into the user's primary calendar — no tab-opening.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { summary, location, description, start, end } = body as CalendarEventInput;

    if (!summary || !start || !end) {
      return NextResponse.json(
        { error: 'summary, start, and end are required' },
        { status: 400 },
      );
    }

    const event = await createCalendarEvent({ summary, location, description, start, end });
    return NextResponse.json({ ok: true, event });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg === 'NOT_CONNECTED') {
      return NextResponse.json(
        {
          error: 'NOT_CONNECTED',
          detail: 'Google Calendar is not connected. Connect it in Profile → Connect Google Calendar.',
        },
        { status: 412 },
      );
    }
    console.error('POST /api/calendar/create error:', msg);
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
