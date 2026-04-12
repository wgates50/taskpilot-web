import { NextRequest, NextResponse } from 'next/server';
import { addEvidenceEntry, getEvidenceLog } from '@/lib/db';
import { verifyClient } from '@/lib/auth';

// GET /api/profile/evidence?limit=50
export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(new URL(req.url).searchParams.get('limit') || '50', 10);
    const log = await getEvidenceLog(limit);
    return NextResponse.json({ log });
  } catch (err) {
    console.error('GET /api/profile/evidence error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/profile/evidence — tasks and the webapp log new evidence
export async function POST(req: NextRequest) {
  if (!verifyClient(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const entry = await req.json();
    if (!entry.taskId || !entry.type || !entry.detail) {
      return NextResponse.json(
        { error: 'taskId, type, and detail are required' },
        { status: 400 }
      );
    }
    await addEvidenceEntry({
      date: entry.date || new Date().toISOString(),
      taskId: entry.taskId,
      type: entry.type,
      detail: entry.detail,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('POST /api/profile/evidence error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
