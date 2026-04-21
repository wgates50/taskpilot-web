import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET /api/unesco/visits
export async function GET() {
  try {
    const result = await sql`
      SELECT v.*, s.name, s.country, s.region, s.category, s.lat, s.lng, s.image_url
      FROM unesco_visits v
      JOIN unesco_sites s ON s.id = v.site_id
      ORDER BY v.visited_date DESC NULLS LAST, v.created_at DESC
    `;
    return NextResponse.json({ visits: result.rows });
  } catch (err) {
    console.error('GET /api/unesco/visits error:', err);
    return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 });
  }
}

// POST /api/unesco/visits { site_id, visited_date?, notes? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { site_id, visited_date, notes } = body;

    if (!site_id) {
      return NextResponse.json({ error: 'site_id is required' }, { status: 400 });
    }

    // Check site exists
    const siteCheck = await sql`SELECT id FROM unesco_sites WHERE id = ${site_id}`;
    if (siteCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Check for existing visit — one visit record per site
    const existing = await sql`SELECT id FROM unesco_visits WHERE site_id = ${site_id}`;
    if (existing.rows.length > 0) {
      // Update existing
      const updated = await sql`
        UPDATE unesco_visits
        SET visited_date = ${visited_date || null},
            notes = ${notes || null}
        WHERE site_id = ${site_id}
        RETURNING *
      `;
      return NextResponse.json({ visit: updated.rows[0] });
    }

    const result = await sql`
      INSERT INTO unesco_visits (site_id, visited_date, notes)
      VALUES (${site_id}, ${visited_date || null}, ${notes || null})
      RETURNING *
    `;
    return NextResponse.json({ visit: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('POST /api/unesco/visits error:', err);
    return NextResponse.json({ error: 'Failed to record visit' }, { status: 500 });
  }
}

// DELETE /api/unesco/visits/:id
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const siteId = searchParams.get('site_id');

    if (id) {
      await sql`DELETE FROM unesco_visits WHERE id = ${parseInt(id)}`;
    } else if (siteId) {
      await sql`DELETE FROM unesco_visits WHERE site_id = ${parseInt(siteId)}`;
    } else {
      return NextResponse.json({ error: 'id or site_id required' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/unesco/visits error:', err);
    return NextResponse.json({ error: 'Failed to delete visit' }, { status: 500 });
  }
}
