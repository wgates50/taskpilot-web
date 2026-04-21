import { NextRequest, NextResponse } from 'next/server';
import { logShownItem, getShownItems } from '@/lib/db';
import { verifyApiKey, verifyClient } from '@/lib/auth';

// GET /api/shown-items?since=7d&source=morning-brief
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since') || undefined;
    const source = searchParams.get('source') || undefined;

    const items = await getShownItems({ since, source });
    return NextResponse.json({ items, count: items.length });
  } catch (err) {
    console.error('GET /api/shown-items error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/shown-items — log that an item was shown
export async function POST(req: NextRequest) {
  if (!verifyClient(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.item_key) {
      return NextResponse.json({ error: 'item_key is required' }, { status: 400 });
    }

    const item = await logShownItem({
      item_key: body.item_key,
      item_title: body.item_title,
      item_category: body.item_category,
      source_task: body.source_task,
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (err) {
    console.error('POST /api/shown-items error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
