import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { setupDatabase } from '@/lib/db';

/**
 * POST /api/unesco/seed
 *
 * Imports the full UNESCO World Heritage list from whc.unesco.org into
 * `unesco_sites`. Mirrors scripts/seed-unesco.mjs so the UI's empty-state
 * "Import UNESCO sites" button works without shelling out to a node script.
 *
 * Safe to re-run — every row is an ON CONFLICT upsert keyed on id.
 *
 * Returns: { inserted: number, total_in_db: number }
 */

// Increase the function timeout so the full (~1200 site) import can complete.
export const maxDuration = 300;

const UNESCO_API = 'https://whc.unesco.org/api/sites/';
const ROWS_PER_PAGE = 500;

const REGION_MAP: Record<string, string> = {
  'Africa': 'Africa',
  'Arab States': 'Arab States',
  'Asia and the Pacific': 'Asia and the Pacific',
  'Europe and North America': 'Europe and North America',
  'Latin America and the Caribbean': 'Latin America and the Caribbean',
};

function normalizeCategory(cat: unknown): 'cultural' | 'natural' | 'mixed' {
  if (!cat || typeof cat !== 'string') return 'cultural';
  const c = cat.toLowerCase();
  if (c.includes('n') && c.includes('c')) return 'mixed';
  if (c === 'n' || c.includes('natural')) return 'natural';
  return 'cultural';
}

interface UnescoApiSite {
  id_number?: string | number;
  site?: string;
  name_en?: string;
  states_name_en?: string;
  states?: string;
  region_en?: string;
  date_inscribed?: string | number;
  category?: string;
  latitude?: string | number;
  longitude?: string | number;
  short_description_en?: string;
  image_url?: string;
}

async function fetchPage(fromRow: number): Promise<UnescoApiSite[]> {
  const url = `${UNESCO_API}?format=json&rows_per_page=${ROWS_PER_PAGE}&from_row=${fromRow}&order=id_number`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`UNESCO API ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data as UnescoApiSite[];
  const unknownData = data as Record<string, unknown>;
  return (unknownData.sites || unknownData.rows || []) as UnescoApiSite[];
}

async function upsertSite(site: UnescoApiSite): Promise<boolean> {
  const id = typeof site.id_number === 'number'
    ? site.id_number
    : parseInt(String(site.id_number ?? ''));
  if (isNaN(id)) return false;

  const name = site.site || site.name_en || '';
  const country = site.states_name_en || site.states || '';
  const region = REGION_MAP[site.region_en || ''] || site.region_en || 'Other';
  const yearInscribed = site.date_inscribed ? parseInt(String(site.date_inscribed)) : null;
  const category = normalizeCategory(site.category);
  const lat = site.latitude != null && site.latitude !== '' ? parseFloat(String(site.latitude)) : null;
  const lng = site.longitude != null && site.longitude !== '' ? parseFloat(String(site.longitude)) : null;
  const shortDesc = site.short_description_en
    ? site.short_description_en.replace(/<[^>]*>/g, '').slice(0, 500).trim()
    : null;
  const unescoUrl = site.id_number ? `https://whc.unesco.org/en/list/${site.id_number}/` : null;
  const imageUrl = site.image_url || null;

  await sql`
    INSERT INTO unesco_sites (id, name, country, region, year_inscribed, category, lat, lng, short_description, unesco_url, image_url)
    VALUES (${id}, ${name}, ${country}, ${region}, ${yearInscribed}, ${category},
            ${lat}, ${lng}, ${shortDesc}, ${unescoUrl}, ${imageUrl})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      country = EXCLUDED.country,
      region = EXCLUDED.region,
      year_inscribed = EXCLUDED.year_inscribed,
      category = EXCLUDED.category,
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      short_description = EXCLUDED.short_description,
      unesco_url = EXCLUDED.unesco_url,
      image_url = EXCLUDED.image_url
  `;
  return true;
}

export async function POST() {
  try {
    // Ensure the unesco_sites table (and related migrations) exist before we
    // try to upsert. Without this, a fresh Vercel DB throws "relation
    // unesco_sites does not exist" and the UI shows a generic "Couldn't load"
    // error instead of the empty-state Import button.
    await setupDatabase();

    let fromRow = 1;
    let totalInserted = 0;

    while (true) {
      const sites = await fetchPage(fromRow);
      if (sites.length === 0) break;

      for (const site of sites) {
        try {
          if (await upsertSite(site)) totalInserted++;
        } catch (err) {
          console.warn(`Upsert failed for site ${site.id_number}:`, err);
        }
      }

      if (sites.length < ROWS_PER_PAGE) break;
      fromRow += ROWS_PER_PAGE;
    }

    const countResult = await sql`SELECT COUNT(*) as total FROM unesco_sites`;
    return NextResponse.json({
      inserted: totalInserted,
      total_in_db: parseInt(countResult.rows[0]?.total || '0'),
    });
  } catch (err) {
    console.error('POST /api/unesco/seed error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'seed failed' },
      { status: 500 },
    );
  }
}
