import { NextRequest, NextResponse } from 'next/server';
import { setupDatabase } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';

// POST /api/setup — run once to create tables
export async function POST(req: NextRequest) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await setupDatabase();
    return NextResponse.json({ ok: true, message: 'Database tables created' });
  } catch (err) {
    console.error('Setup error:', err);
    return NextResponse.json({ error: 'Setup failed', details: String(err) }, { status: 500 });
  }
}
