import { NextRequest, NextResponse } from 'next/server';
import { savePushSubscription, removePushSubscription } from '@/lib/db';
import { verifyClient } from '@/lib/auth';

// POST /api/push — subscribe to push notifications
export async function POST(req: NextRequest) {
  if (!verifyClient(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { subscription } = await req.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }
    await savePushSubscription(subscription);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/push error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/push — unsubscribe
export async function DELETE(req: NextRequest) {
  if (!verifyClient(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint is required' }, { status: 400 });
    }
    await removePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/push error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
