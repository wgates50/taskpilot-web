import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-auth';

// GET /api/auth/google/consent
// Redirects the user to Google's OAuth consent screen. On success, Google
// sends them back to /api/auth/google/callback with a `code` query param.
export async function GET() {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'OAuth not configured', detail: msg },
      { status: 500 },
    );
  }
}
