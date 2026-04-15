import { NextRequest, NextResponse } from 'next/server';
import {
  getBriefImpressions,
  recordBriefImpressions,
  resetBriefImpression,
} from '@/lib/db';

/**
 * GET /api/brief-impressions?type=whats-on&maxShows=3&cooldownDays=14
 *
 * Returns impression records for the given item_type plus a
 * suppressed_ids array computed from caller-supplied rules.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemType = searchParams.get('type');
    if (!itemType) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }    const maxShows = parseInt(searchParams.get('maxShows') || '3', 10);
    const cooldownDays = parseInt(searchParams.get('cooldownDays') || '14', 10);

    const rows = await getBriefImpressions(itemType);
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const suppressed_ids = rows
      .filter((r) => {
        if (r.show_count >= maxShows) return true;
        const lastShown = new Date(r.last_shown_at).getTime();
        return now - lastShown < cooldownMs;
      })
      .map((r) => r.item_id);

    return NextResponse.json({
      impressions: rows,
      suppressed_ids,
      rule: { maxShows, cooldownDays },
    });
  } catch (err) {
    console.error('GET /api/brief-impressions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/brief-impressions
 * Body: { type: 'whats-on' | 'article', items: [{ id, title?, url? }] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const itemType = body.type;
    const items = body.items;
    if (!itemType || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'type and items[] are required' },
        { status: 400 }
      );
    }
    const validItems = items.filter(
      (it: { id?: string }) => typeof it?.id === 'string' && it.id.length > 0
    );
    const count = await recordBriefImpressions(itemType, validItems);
    return NextResponse.json({ recorded: count }, { status: 201 });
  } catch (err) {
    console.error('POST /api/brief-impressions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/brief-impressions?type=whats-on&id=xyz
 * Clears an impression so the item can appear again.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemType = searchParams.get('type');
    const itemId = searchParams.get('id');
    if (!itemType || !itemId) {
      return NextResponse.json({ error: 'type and id are required' }, { status: 400 });
    }
    await resetBriefImpression(itemId, itemType);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/brief-impressions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
