import { NextRequest, NextResponse } from 'next/server';
import { getPins, togglePin } from '@/lib/db';
import { verifyClient } from '@/lib/auth';

// GET /api/pins
export async function GET() {
  try {
    const pins = await getPins();
    return NextResponse.json({ pins });
  } catch (err) {
    console.error('GET /api/pins error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/pins — { taskId: "morning-brief" }
export async function POST(req: NextRequest) {
  if (!verifyClient(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { taskId } = await req.json();
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }
    const isPinned = await togglePin(taskId);
    return NextResponse.json({ taskId, pinned: isPinned });
  } catch (err) {
    console.error('POST /api/pins error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
