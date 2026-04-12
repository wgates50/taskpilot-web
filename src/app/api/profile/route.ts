import { NextRequest, NextResponse } from 'next/server';
import { getProfile, upsertProfile } from '@/lib/db';
import { verifyClient } from '@/lib/auth';

// GET /api/profile — read the taste profile (used by tasks + webapp)
export async function GET() {
  try {
    const profile = await getProfile();
    return NextResponse.json({ profile: profile || {} });
  } catch (err) {
    console.error('GET /api/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/profile — update the entire profile
export async function PUT(req: NextRequest) {
  if (!verifyClient(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    await upsertProfile(body.profile || body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/profile — partial update (merge into existing)
export async function PATCH(req: NextRequest) {
  if (!verifyClient(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const updates = await req.json();
    const existing = await getProfile() || {};
    const merged = { ...existing, ...updates };
    await upsertProfile(merged);
    return NextResponse.json({ ok: true, profile: merged });
  } catch (err) {
    console.error('PATCH /api/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
