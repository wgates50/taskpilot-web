import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET /api/interactions?item_key=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const itemKey = searchParams.get('item_key');

  try {
    if (itemKey) {
      const result = await sql`
        SELECT * FROM interactions WHERE item_key = ${itemKey} ORDER BY created_at DESC LIMIT 1
      `;
      return NextResponse.json({ interaction: result.rows[0] || null });
    }

    const result = await sql`
      SELECT * FROM interactions ORDER BY created_at DESC LIMIT 100
    `;
    return NextResponse.json({ interactions: result.rows });
  } catch (err) {
    console.error('GET /api/interactions error:', err);
    return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 });
  }
}

// POST /api/interactions { item_key, item_title?, type: 'attended' | 'missed' }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { item_key, item_title, type } = body;

    if (!item_key || !type) {
      return NextResponse.json({ error: 'item_key and type are required' }, { status: 400 });
    }
    if (type !== 'attended' && type !== 'missed') {
      return NextResponse.json({ error: 'type must be attended or missed' }, { status: 400 });
    }

    // Upsert: if the same item already has an interaction, update it
    const result = await sql`
      INSERT INTO interactions (item_key, item_title, type)
      VALUES (${item_key}, ${item_title || null}, ${type})
      ON CONFLICT DO NOTHING
      RETURNING *
    `;

    // If nothing was inserted (due to DO NOTHING), update existing
    if (result.rows.length === 0) {
      const updated = await sql`
        UPDATE interactions SET type = ${type}, created_at = NOW()
        WHERE item_key = ${item_key}
        RETURNING *
      `;
      return NextResponse.json({ interaction: updated.rows[0] });
    }

    return NextResponse.json({ interaction: result.rows[0] });
  } catch (err) {
    console.error('POST /api/interactions error:', err);
    return NextResponse.json({ error: 'Failed to record interaction' }, { status: 500 });
  }
}
