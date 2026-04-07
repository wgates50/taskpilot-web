import { NextRequest } from 'next/server';

// Simple API key auth for task ingestion endpoints
// Set TASKPILOT_API_KEY in Vercel env vars
export function verifyApiKey(req: NextRequest): boolean {
  const key = req.headers.get('authorization')?.replace('Bearer ', '');
  const expected = process.env.TASKPILOT_API_KEY;
  if (!expected) return false;
  return key === expected;
}
