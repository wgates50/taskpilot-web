import { NextRequest, NextResponse } from 'next/server';
import { updateCalendarEvent, deleteCalendarEvent, type CalendarEventInput } from '@/lib/google-auth';

interface Ctx { params: Promise<{ id: string }> }

// PATCH /api/calendar/events/[id]
// Body: partial CalendarEventInput (summary / location / description /
// start / end). Returns the updated event.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const body = (await req.json()) as Partial<CalendarEventInput>;
    const updated = await updateCalendarEvent(id, body);
    return NextResponse.json({ ok: true, event: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg === 'NOT_CONNECTED') {
      return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 412 });
    }
    console.error('PATCH /api/calendar/events/[id] error:', msg);
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}

// DELETE /api/calendar/events/[id]
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await deleteCalendarEvent(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg === 'NOT_CONNECTED') {
      return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 412 });
    }
    console.error('DELETE /api/calendar/events/[id] error:', msg);
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
