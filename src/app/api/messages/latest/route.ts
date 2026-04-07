import { NextResponse } from 'next/server';
import { getLatestMessages, getUnreadCounts } from '@/lib/db';

// GET /api/messages/latest — latest message per task + unread counts
export async function GET() {
  try {
    const [latest, unreads] = await Promise.all([
      getLatestMessages(),
      getUnreadCounts(),
    ]);

    return NextResponse.json({ latest, unreads });
  } catch (err) {
    console.error('GET /api/messages/latest error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
