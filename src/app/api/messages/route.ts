import { NextRequest, NextResponse } from 'next/server';
import { insertMessage, getMessages, markTaskRead } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';
import { sendPushNotification } from '@/lib/push';
import { TASK_MAP } from '@/lib/tasks';
import { v4 as uuidv4 } from 'uuid';

// POST /api/messages — tasks post new messages here
export async function POST(req: NextRequest) {
  // Clone the request body so we can peek at isFromUser before auth check
  const body = await req.json();

  // User replies from the webapp don't need API key auth (personal tool)
  // Task ingestion requires API key
  if (!body.isFromUser && !verifyApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { taskId, blocks, timestamp, isFromUser } = body;

    if (!taskId || !blocks) {
      return NextResponse.json({ error: 'taskId and blocks are required' }, { status: 400 });
    }

    if (!TASK_MAP[taskId]) {
      return NextResponse.json({ error: `Unknown task: ${taskId}` }, { status: 400 });
    }

    const id = body.id || uuidv4();
    const ts = timestamp || new Date().toISOString();

    const message = await insertMessage(id, taskId, blocks, ts, isFromUser || false);

    // Send push notification for task messages (not user replies)
    if (!isFromUser) {
      try {
        await sendPushNotification(taskId, blocks);
      } catch (e) {
        console.error('Push notification failed:', e);
        // Don't fail the request if push fails
      }
    }

    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch (err) {
    console.error('POST /api/messages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/messages?taskId=xxx&limit=50&before=ISO_TIMESTAMP
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const before = searchParams.get('before') || undefined;

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const messages = await getMessages(taskId, limit, before);

    // Mark as read when fetched
    await markTaskRead(taskId);

    return NextResponse.json({ messages: messages.reverse() }); // chronological order
  } catch (err) {
    console.error('GET /api/messages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
