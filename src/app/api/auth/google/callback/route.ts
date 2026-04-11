import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, saveTokens } from '@/lib/google-auth';

// GET /api/auth/google/callback?code=...&state=...
// Google redirects here after the user grants consent. We exchange the code
// for tokens, persist them, and redirect back to the Profile screen with a
// success flag so the UI can show "Connected".
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/?tab=profile&google=${encodeURIComponent(error)}`, req.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL('/?tab=profile&google=missing_code', req.url));
  }

  try {
    const tokens = await exchangeCode(code);
    await saveTokens(tokens);
    return NextResponse.redirect(new URL('/?tab=profile&google=connected', req.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('OAuth callback error:', msg);
    return NextResponse.redirect(
      new URL(`/?tab=profile&google=${encodeURIComponent('error:' + msg)}`, req.url),
    );
  }
}
