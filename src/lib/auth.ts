import { NextRequest } from 'next/server';

// Bearer-token auth for task ingestion endpoints (server-to-server).
// Set TASKPILOT_API_KEY in Vercel env vars.
export function verifyApiKey(req: NextRequest): boolean {
  const key = req.headers.get('authorization')?.replace('Bearer ', '');
  const expected = process.env.TASKPILOT_API_KEY;
  if (!expected) return false;
  return key === expected;
}

// Looser check for routes the in-browser webapp needs to call.
// Accepts either a valid Bearer token (tasks/scripts) OR a same-origin
// browser fetch (Sec-Fetch-Site header is browser-set and cannot be
// spoofed by a cross-site attacker via fetch/XHR/form POST).
export function verifyClient(req: NextRequest): boolean {
  if (verifyApiKey(req)) return true;
  const site = req.headers.get('sec-fetch-site');
  // 'same-origin' = fetch from our own page
  // 'none' = address-bar navigation (rare for non-GET, but harmless)
  return site === 'same-origin' || site === 'none';
}
