import { NextRequest, NextResponse } from 'next/server';
import { getEvents, upsertEvent, updateEventStatus } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';

// GET /api/events?from=2026-04-08&to=2026-04-15&status=pending
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || new Date().toISOString();
    const to = searchParams.get('to') || new Date(Date.now() + 7 * 86400000).toISOString();
    const status = searchParams.get('status') || undefined;

    const events = await getEvents(from, to, status);
    return NextResponse.json({ events, from, to });
  } catch (err) {
    console.error('GET /api/events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/events — task pushes cached events
export async function POST(req: NextRequest) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (Array.isArray(body.events)) {
      const results = [];
      for (const event of body.events) {
        if (!event.id || !event.title) continue;
        const result = await upsertEvent(event);
        results.push(result);
      }
      return NextResponse.json({ ok: true, count: results.length }, { status: 201 });
    }

    if (!body.id || !body.title) {
      return NextResponse.json({ error: 'id and title are required' }, { status: 400 });
    }

    const event = await upsertEvent(body);
    return NextResponse.json({ ok: true, event }, { status: 201 });
  } catch (err) {
    console.error('POST /api/events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/events — update event status
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    await updateEventStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
