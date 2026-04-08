import { NextRequest, NextResponse } from 'next/server';
import { getAllUserContext, getUserContext, setUserContext } from '@/lib/db';

// GET /api/context — read all user context (location, companions, etc.)
export async function GET() {
  try {
    const context = await getAllUserContext();
    return NextResponse.json({ context });
  } catch (err) {
    console.error('GET /api/context error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/context — set a context key (used by app for location/companions)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
    }

    await setUserContext(key, value);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/context error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
