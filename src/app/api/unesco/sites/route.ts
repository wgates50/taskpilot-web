import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET /api/unesco/sites?region=Europe&country=Italy&category=cultural&search=colosseum&lat=51.5&lng=-0.1&radius=200
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get('region');
    const country = searchParams.get('country');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const radius = parseFloat(searchParams.get('radius') || '500'); // km
    const includeVisited = searchParams.get('include_visited') !== 'false';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build dynamic query parts
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (region) {
      conditions.push(`region = $${paramIdx++}`);
      params.push(region);
    }
    if (country) {
      conditions.push(`country ILIKE $${paramIdx++}`);
      params.push(`%${country}%`);
    }
    if (category) {
      conditions.push(`category = $${paramIdx++}`);
      params.push(category);
    }
    if (search) {
      conditions.push(`(name ILIKE $${paramIdx} OR country ILIKE $${paramIdx} OR short_description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Main query with visit join
    const result = await sql.query(
      `SELECT s.*,
              v.id AS visit_id,
              v.visited_date,
              v.notes AS visit_notes
       FROM unesco_sites s
       LEFT JOIN unesco_visits v ON v.site_id = s.id
       ${whereClause}
       ORDER BY s.region, s.country, s.name
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    // Count query
    const countResult = await sql.query(
      `SELECT COUNT(*) as total FROM unesco_sites s ${whereClause}`,
      params
    );

    // Get visited site IDs for progress
    const visitedResult = await sql`SELECT DISTINCT site_id FROM unesco_visits`;
    const visitedIds = new Set(visitedResult.rows.map(r => r.site_id));

    // If nearby filter requested, post-filter by distance
    let rows = result.rows;
    if (!isNaN(lat) && !isNaN(lng)) {
      rows = rows.filter(site => {
        if (site.lat == null || site.lng == null) return false;
        const dlat = (site.lat - lat) * (Math.PI / 180);
        const dlng = (site.lng - lng) * (Math.PI / 180);
        const a = Math.sin(dlat / 2) ** 2 +
          Math.cos(lat * Math.PI / 180) * Math.cos(site.lat * Math.PI / 180) * Math.sin(dlng / 2) ** 2;
        const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        site.distance_km = Math.round(dist);
        return dist <= radius;
      });
      rows.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
    }

    // Get distinct regions and countries for filters
    const regionsResult = await sql`SELECT DISTINCT region FROM unesco_sites ORDER BY region`;
    const countriesResult = await sql`SELECT DISTINCT country FROM unesco_sites ORDER BY country`;

    return NextResponse.json({
      sites: rows,
      total: parseInt(countResult.rows[0]?.total || '0'),
      visited_count: visitedIds.size,
      total_sites: parseInt(countResult.rows[0]?.total || '0'),
      filters: {
        regions: regionsResult.rows.map(r => r.region),
        countries: countriesResult.rows.map(r => r.country),
      },
    });
  } catch (err) {
    // If the tables don't exist yet (e.g. fresh Vercel DB, or a redeploy onto
    // a new branch's preview DB), return an empty-state response so the UI
    // renders its "Import UNESCO sites" button instead of a generic error.
    // Postgres errcode 42P01 = undefined_table.
    const pgCode = (err as { code?: string } | null)?.code;
    const msg = err instanceof Error ? err.message : String(err);
    if (pgCode === '42P01' || /relation .* does not exist/i.test(msg)) {
      return NextResponse.json({
        sites: [],
        total: 0,
        visited_count: 0,
        total_sites: 0,
        filters: { regions: [], countries: [] },
      });
    }
    console.error('GET /api/unesco/sites error:', err);
    return NextResponse.json({ error: 'Failed to fetch UNESCO sites' }, { status: 500 });
  }
}
