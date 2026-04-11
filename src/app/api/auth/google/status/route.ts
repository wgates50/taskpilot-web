import { NextResponse } from 'next/server';
import { getConnectionStatus } from '@/lib/google-auth';

// GET /api/auth/google/status
// Returns { connected: boolean, scope?: string, expiresAt?: number }
// The Profile screen polls this to show the "Connect Google Calendar" button
// state (connected / not connected / expired).
export async function GET() {
  try {
    const status = await getConnectionStatus();
    return NextResponse.json(status);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ connected: false, error: msg }, { status: 500 });
  }
}
