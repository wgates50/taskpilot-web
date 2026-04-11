/**
 * UNESCO World Heritage Sites seed script
 *
 * Fetches the full list from the UNESCO WHC API and upserts into the database.
 * Run: node scripts/seed-unesco.mjs
 *
 * Requires POSTGRES_URL env var (or .env.local / Vercel env).
 * The UNESCO API endpoint: https://whc.unesco.org/api/sites/
 *
 * UNESCO API docs: https://whc.unesco.org/en/syndication
 * Returns JSON with up to 500 sites per request; paginate with rows_per_page and from_row.
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local if present
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

const require = createRequire(import.meta.url);
const { sql } = await import('@vercel/postgres');

const UNESCO_API = 'https://whc.unesco.org/api/sites/';
const ROWS_PER_PAGE = 500;

/**
 * Maps UNESCO region codes to friendly region names
 */
const REGION_MAP = {
  'Africa': 'Africa',
  'Arab States': 'Arab States',
  'Asia and the Pacific': 'Asia and the Pacific',
  'Europe and North America': 'Europe and North America',
  'Latin America and the Caribbean': 'Latin America and the Caribbean',
};

/**
 * Normalize UNESCO category: C = cultural, N = natural, C/N or N/C = mixed
 */
function normalizeCategory(cat) {
  if (!cat) return 'cultural';
  const c = cat.toLowerCase();
  if (c.includes('n') && c.includes('c')) return 'mixed';
  if (c === 'n' || c.includes('natural')) return 'natural';
  return 'cultural';
}

async function fetchPage(fromRow) {
  const url = `${UNESCO_API}?format=json&rows_per_page=${ROWS_PER_PAGE}&from_row=${fromRow}&order=id_number`;
  console.log(`Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`UNESCO API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function upsertSite(site) {
  const id = parseInt(site.id_number);
  if (isNaN(id)) return;

  const name = site.site || site.name_en || '';
  const country = site.states_name_en || site.states || '';
  const region = REGION_MAP[site.region_en] || site.region_en || 'Other';
  const yearInscribed = site.date_inscribed ? parseInt(site.date_inscribed) : null;
  const category = normalizeCategory(site.category);
  const lat = site.latitude ? parseFloat(site.latitude) : null;
  const lng = site.longitude ? parseFloat(site.longitude) : null;
  const shortDesc = site.short_description_en
    ? site.short_description_en.replace(/<[^>]*>/g, '').slice(0, 500).trim()
    : null;
  const unescoUrl = site.id_number
    ? `https://whc.unesco.org/en/list/${site.id_number}/`
    : null;
  const imageUrl = site.image_url || null;

  await sql`
    INSERT INTO unesco_sites (id, name, country, region, year_inscribed, category, lat, lng, short_description, unesco_url, image_url)
    VALUES (
      ${id},
      ${name},
      ${country},
      ${region},
      ${yearInscribed},
      ${category},
      ${lat},
      ${lng},
      ${shortDesc},
      ${unescoUrl},
      ${imageUrl}
    )
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
}

async function main() {
  console.log('Starting UNESCO World Heritage Sites seed...\n');

  let fromRow = 1;
  let totalInserted = 0;
  let page = 1;

  while (true) {
    let data;
    try {
      data = await fetchPage(fromRow);
    } catch (err) {
      console.error(`Failed to fetch page ${page}:`, err.message);
      break;
    }

    // The API returns { sites: [...] } or directly an array
    const sites = Array.isArray(data) ? data : (data.sites || data.rows || []);

    if (sites.length === 0) {
      console.log('No more sites — done.');
      break;
    }

    console.log(`Page ${page}: processing ${sites.length} sites...`);

    for (const site of sites) {
      try {
        await upsertSite(site);
        totalInserted++;
      } catch (err) {
        console.warn(`  Failed to upsert site ${site.id_number} "${site.site}": ${err.message}`);
      }
    }

    console.log(`  Inserted/updated ${sites.length} sites. Total so far: ${totalInserted}`);

    if (sites.length < ROWS_PER_PAGE) break; // last page
    fromRow += ROWS_PER_PAGE;
    page++;

    // Small delay to be respectful to the UNESCO API
    await new Promise(r => setTimeout(r, 500));
  }

  // Final count
  const countResult = await sql`SELECT COUNT(*) as total FROM unesco_sites`;
  console.log(`\nSeed complete. Total sites in DB: ${countResult.rows[0].total}`);
  console.log(`Sites inserted/updated this run: ${totalInserted}`);
}

main().catch(err => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
