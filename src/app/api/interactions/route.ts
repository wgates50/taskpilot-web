import { NextRequest, NextResponse } from 'next/server';
import { logInteraction, getInteractions } from '@/lib/db';
import { verifyClient } from '@/lib/auth';

// GET /api/interactions?item_key=X — interaction history for an item
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemKey = searchParams.get('item_key');

    if (!itemKey) {
      return NextResponse.json({ error: 'item_key query param is required' }, { status: 400 });
    }

    const interactions = await getInteractions(itemKey);
    return NextResponse.json({ interactions, count: interactions.length });
  } catch (err) {
    console.error('GET /api/interactions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/interactions — log an engagement
export async function POST(req: NextRequest) {
  if (!verifyClient(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.item_key || !body.interaction_type) {
      return NextResponse.json(
        { error: 'item_key and interaction_type are required' },
        { status: 400 }
      );
    }

    const validTypes = ['saved', 'calendared', 'clicked', 'dismissed', 'attended', 'missed'];
    if (!validTypes.includes(body.interaction_type)) {
      return NextResponse.json(
        { error: `interaction_type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const interaction = await logInteraction(body.item_key, body.interaction_type);
    return NextResponse.json({ ok: true, interaction }, { status: 201 });
  } catch (err) {
    console.error('POST /api/interactions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
