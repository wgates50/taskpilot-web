'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UnescoSite {
  id: number;
  name: string;
  country: string;
  region: string;
  year_inscribed: number | null;
  category: 'cultural' | 'natural' | 'mixed';
  lat: number | null;
  lng: number | null;
  short_description: string | null;
  image_url: string | null;
  unesco_url: string | null;
  // joined from visits
  visit_id: number | null;
  visited_date: string | null;
  visit_notes: string | null;
}

interface CountrySummary {
  country: string;
  flag: string;
  region: string;
  total: number;
  visited: number;
  sites: UnescoSite[];
}

type View = 'countries' | 'country-sites' | 'site-detail';

/* ------------------------------------------------------------------ */
/*  Country flag emoji lookup                                          */
/* ------------------------------------------------------------------ */

function countryFlag(name: string): string {
  const FLAGS: Record<string, string> = {
    'Afghanistan': '\u{1F1E6}\u{1F1EB}', 'Albania': '\u{1F1E6}\u{1F1F1}', 'Algeria': '\u{1F1E9}\u{1F1FF}',
    'Andorra': '\u{1F1E6}\u{1F1E9}', 'Angola': '\u{1F1E6}\u{1F1F4}', 'Argentina': '\u{1F1E6}\u{1F1F7}',
    'Armenia': '\u{1F1E6}\u{1F1F2}', 'Australia': '\u{1F1E6}\u{1F1FA}', 'Austria': '\u{1F1E6}\u{1F1F9}',
    'Azerbaijan': '\u{1F1E6}\u{1F1FF}', 'Bahrain': '\u{1F1E7}\u{1F1ED}', 'Bangladesh': '\u{1F1E7}\u{1F1E9}',
    'Belarus': '\u{1F1E7}\u{1F1FE}', 'Belgium': '\u{1F1E7}\u{1F1EA}', 'Belize': '\u{1F1E7}\u{1F1FF}',
    'Benin': '\u{1F1E7}\u{1F1EF}', 'Bhutan': '\u{1F1E7}\u{1F1F9}', 'Bolivia': '\u{1F1E7}\u{1F1F4}',
    'Bosnia and Herzegovina': '\u{1F1E7}\u{1F1E6}', 'Botswana': '\u{1F1E7}\u{1F1FC}',
    'Brazil': '\u{1F1E7}\u{1F1F7}', 'Bulgaria': '\u{1F1E7}\u{1F1EC}', 'Burkina Faso': '\u{1F1E7}\u{1F1EB}',
    'Cabo Verde': '\u{1F1E8}\u{1F1FB}', 'Cambodia': '\u{1F1F0}\u{1F1ED}', 'Cameroon': '\u{1F1E8}\u{1F1F2}',
    'Canada': '\u{1F1E8}\u{1F1E6}', 'Central African Republic': '\u{1F1E8}\u{1F1EB}',
    'Chad': '\u{1F1F9}\u{1F1E9}', 'Chile': '\u{1F1E8}\u{1F1F1}', 'China': '\u{1F1E8}\u{1F1F3}',
    'Colombia': '\u{1F1E8}\u{1F1F4}', 'Congo': '\u{1F1E8}\u{1F1EC}',
    'Costa Rica': '\u{1F1E8}\u{1F1F7}', "Cote d'Ivoire": '\u{1F1E8}\u{1F1EE}',
    'Croatia': '\u{1F1ED}\u{1F1F7}', 'Cuba': '\u{1F1E8}\u{1F1FA}', 'Cyprus': '\u{1F1E8}\u{1F1FE}',
    'Czechia': '\u{1F1E8}\u{1F1FF}', 'Czech Republic': '\u{1F1E8}\u{1F1FF}',
    'Democratic Republic of the Congo': '\u{1F1E8}\u{1F1E9}',
    'Denmark': '\u{1F1E9}\u{1F1F0}', 'Dominican Republic': '\u{1F1E9}\u{1F1F4}',
    'Ecuador': '\u{1F1EA}\u{1F1E8}', 'Egypt': '\u{1F1EA}\u{1F1EC}', 'El Salvador': '\u{1F1F8}\u{1F1FB}',
    'Eritrea': '\u{1F1EA}\u{1F1F7}', 'Estonia': '\u{1F1EA}\u{1F1EA}', 'Ethiopia': '\u{1F1EA}\u{1F1F9}',
    'Fiji': '\u{1F1EB}\u{1F1EF}', 'Finland': '\u{1F1EB}\u{1F1EE}', 'France': '\u{1F1EB}\u{1F1F7}',
    'Gabon': '\u{1F1EC}\u{1F1E6}', 'Gambia': '\u{1F1EC}\u{1F1F2}', 'Georgia': '\u{1F1EC}\u{1F1EA}',
    'Germany': '\u{1F1E9}\u{1F1EA}', 'Ghana': '\u{1F1EC}\u{1F1ED}', 'Greece': '\u{1F1EC}\u{1F1F7}',
    'Guatemala': '\u{1F1EC}\u{1F1F9}', 'Guinea': '\u{1F1EC}\u{1F1F3}', 'Haiti': '\u{1F1ED}\u{1F1F9}',
    'Honduras': '\u{1F1ED}\u{1F1F3}', 'Hungary': '\u{1F1ED}\u{1F1FA}', 'Iceland': '\u{1F1EE}\u{1F1F8}',
    'India': '\u{1F1EE}\u{1F1F3}', 'Indonesia': '\u{1F1EE}\u{1F1E9}', 'Iran': '\u{1F1EE}\u{1F1F7}',
    'Iran (Islamic Republic of)': '\u{1F1EE}\u{1F1F7}', 'Iraq': '\u{1F1EE}\u{1F1F6}',
    'Ireland': '\u{1F1EE}\u{1F1EA}', 'Israel': '\u{1F1EE}\u{1F1F1}', 'Italy': '\u{1F1EE}\u{1F1F9}',
    'Jamaica': '\u{1F1EF}\u{1F1F2}', 'Japan': '\u{1F1EF}\u{1F1F5}', 'Jordan': '\u{1F1EF}\u{1F1F4}',
    'Kazakhstan': '\u{1F1F0}\u{1F1FF}', 'Kenya': '\u{1F1F0}\u{1F1EA}',
    'Korea, Republic of': '\u{1F1F0}\u{1F1F7}', 'South Korea': '\u{1F1F0}\u{1F1F7}',
    'Kuwait': '\u{1F1F0}\u{1F1FC}', 'Kyrgyzstan': '\u{1F1F0}\u{1F1EC}',
    'Lao People\'s Democratic Republic': '\u{1F1F1}\u{1F1E6}', 'Laos': '\u{1F1F1}\u{1F1E6}',
    'Latvia': '\u{1F1F1}\u{1F1FB}', 'Lebanon': '\u{1F1F1}\u{1F1E7}', 'Lesotho': '\u{1F1F1}\u{1F1F8}',
    'Libya': '\u{1F1F1}\u{1F1FE}', 'Lithuania': '\u{1F1F1}\u{1F1F9}', 'Luxembourg': '\u{1F1F1}\u{1F1FA}',
    'Madagascar': '\u{1F1F2}\u{1F1EC}', 'Malawi': '\u{1F1F2}\u{1F1FC}', 'Malaysia': '\u{1F1F2}\u{1F1FE}',
    'Mali': '\u{1F1F2}\u{1F1F1}', 'Malta': '\u{1F1F2}\u{1F1F9}', 'Mauritania': '\u{1F1F2}\u{1F1F7}',
    'Mauritius': '\u{1F1F2}\u{1F1FA}', 'Mexico': '\u{1F1F2}\u{1F1FD}', 'Mongolia': '\u{1F1F2}\u{1F1F3}',
    'Montenegro': '\u{1F1F2}\u{1F1EA}', 'Morocco': '\u{1F1F2}\u{1F1E6}', 'Mozambique': '\u{1F1F2}\u{1F1FF}',
    'Myanmar': '\u{1F1F2}\u{1F1F2}', 'Namibia': '\u{1F1F3}\u{1F1E6}', 'Nepal': '\u{1F1F3}\u{1F1F5}',
    'Netherlands': '\u{1F1F3}\u{1F1F1}', 'New Zealand': '\u{1F1F3}\u{1F1FF}',
    'Nicaragua': '\u{1F1F3}\u{1F1EE}', 'Niger': '\u{1F1F3}\u{1F1EA}', 'Nigeria': '\u{1F1F3}\u{1F1EC}',
    'North Macedonia': '\u{1F1F2}\u{1F1F0}', 'Norway': '\u{1F1F3}\u{1F1F4}', 'Oman': '\u{1F1F4}\u{1F1F2}',
    'Pakistan': '\u{1F1F5}\u{1F1F0}', 'Panama': '\u{1F1F5}\u{1F1E6}', 'Papua New Guinea': '\u{1F1F5}\u{1F1EC}',
    'Paraguay': '\u{1F1F5}\u{1F1FE}', 'Peru': '\u{1F1F5}\u{1F1EA}', 'Philippines': '\u{1F1F5}\u{1F1ED}',
    'Poland': '\u{1F1F5}\u{1F1F1}', 'Portugal': '\u{1F1F5}\u{1F1F9}', 'Qatar': '\u{1F1F6}\u{1F1E6}',
    'Romania': '\u{1F1F7}\u{1F1F4}', 'Russian Federation': '\u{1F1F7}\u{1F1FA}', 'Russia': '\u{1F1F7}\u{1F1FA}',
    'Rwanda': '\u{1F1F7}\u{1F1FC}', 'Saudi Arabia': '\u{1F1F8}\u{1F1E6}', 'Senegal': '\u{1F1F8}\u{1F1F3}',
    'Serbia': '\u{1F1F7}\u{1F1F8}', 'Singapore': '\u{1F1F8}\u{1F1EC}', 'Slovakia': '\u{1F1F8}\u{1F1F0}',
    'Slovenia': '\u{1F1F8}\u{1F1EE}', 'Solomon Islands': '\u{1F1F8}\u{1F1E7}',
    'South Africa': '\u{1F1FF}\u{1F1E6}', 'Spain': '\u{1F1EA}\u{1F1F8}', 'Sri Lanka': '\u{1F1F1}\u{1F1F0}',
    'Sudan': '\u{1F1F8}\u{1F1E9}', 'Suriname': '\u{1F1F8}\u{1F1F7}', 'Sweden': '\u{1F1F8}\u{1F1EA}',
    'Switzerland': '\u{1F1E8}\u{1F1ED}', 'Syrian Arab Republic': '\u{1F1F8}\u{1F1FE}',
    'Tajikistan': '\u{1F1F9}\u{1F1EF}', 'Thailand': '\u{1F1F9}\u{1F1ED}',
    'Timor-Leste': '\u{1F1F9}\u{1F1F1}', 'Togo': '\u{1F1F9}\u{1F1EC}', 'Tunisia': '\u{1F1F9}\u{1F1F3}',
    'Turkey': '\u{1F1F9}\u{1F1F7}', 'Turkmenistan': '\u{1F1F9}\u{1F1F2}',
    'Uganda': '\u{1F1FA}\u{1F1EC}', 'Ukraine': '\u{1F1FA}\u{1F1E6}',
    'United Arab Emirates': '\u{1F1E6}\u{1F1EA}', 'United Kingdom': '\u{1F1EC}\u{1F1E7}',
    'United Kingdom of Great Britain and Northern Ireland': '\u{1F1EC}\u{1F1E7}',
    'United Republic of Tanzania': '\u{1F1F9}\u{1F1FF}', 'Tanzania': '\u{1F1F9}\u{1F1FF}',
    'United States of America': '\u{1F1FA}\u{1F1F8}', 'United States': '\u{1F1FA}\u{1F1F8}',
    'Uruguay': '\u{1F1FA}\u{1F1FE}', 'Uzbekistan': '\u{1F1FA}\u{1F1FF}',
    'Venezuela': '\u{1F1FB}\u{1F1EA}', 'Viet Nam': '\u{1F1FB}\u{1F1F3}', 'Vietnam': '\u{1F1FB}\u{1F1F3}',
    'Yemen': '\u{1F1FE}\u{1F1EA}', 'Zambia': '\u{1F1FF}\u{1F1F2}', 'Zimbabwe': '\u{1F1FF}\u{1F1FC}',
  };

  // Try exact match first, then partial
  if (FLAGS[name]) return FLAGS[name];
  const lower = name.toLowerCase();
  for (const [key, flag] of Object.entries(FLAGS)) {
    if (key.toLowerCase() === lower || lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return flag;
    }
  }
  // Fallback: generate from ISO 3166-1 alpha-2 if name is short enough
  return '';
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const CATEGORIES = ['cultural', 'natural', 'mixed'] as const;

function categoryDot(cat: string): string {
  if (cat === 'natural') return '#16a34a';
  if (cat === 'mixed') return '#9333ea';
  return '#d97706'; // cultural
}

function categoryLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

/* ------------------------------------------------------------------ */
/*  Visit Modal (bottom sheet)                                         */
/* ------------------------------------------------------------------ */

function VisitModal({ site, onSave, onRemove, onClose }: {
  site: UnescoSite;
  onSave: (siteId: number, date: string, notes: string) => Promise<void>;
  onRemove: (siteId: number) => Promise<void>;
  onClose: () => void;
}) {
  const [date, setDate] = useState(site.visited_date ? site.visited_date.split('T')[0] : '');
  const [notes, setNotes] = useState(site.visit_notes || '');
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[430px] bg-white rounded-t-2xl shadow-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="text-[15px] font-semibold text-gray-900 mb-0.5">{site.name}</h3>
        <p className="text-[12px] text-gray-500 mb-4">{site.country}</p>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Visit date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any memories to capture..."
              rows={3}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={async () => { setSaving(true); await onSave(site.id, date, notes); setSaving(false); onClose(); }}
            disabled={saving}
            className="flex-1 py-2.5 text-[13px] font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : site.visit_id ? 'Update visit' : 'Mark as visited'}
          </button>
          {site.visit_id && (
            <button
              onClick={async () => { setSaving(true); await onRemove(site.id); setSaving(false); onClose(); }}
              disabled={saving}
              className="px-4 py-2.5 text-[13px] font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Site Detail Panel                                                  */
/* ------------------------------------------------------------------ */

function SiteDetail({ site, onBack, onToggle }: {
  site: UnescoSite;
  onBack: () => void;
  onToggle: (site: UnescoSite) => void;
}) {
  const visited = !!site.visit_id;

  return (
    <div className="flex flex-col min-h-full">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1.5 px-4 pt-3 pb-1 text-[13px] text-gray-500 hover:text-gray-700 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      {/* Image */}
      {site.image_url && (
        <div className="mx-4 mt-2 h-44 rounded-2xl overflow-hidden bg-gray-100">
          <img
            src={site.image_url}
            alt={site.name}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <div className="px-4 pt-3 pb-6 space-y-4">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: categoryDot(site.category) }} />
            <span className="text-[11px] text-gray-400 capitalize">{site.category}</span>
            {site.year_inscribed && <span className="text-[11px] text-gray-400">Inscribed {site.year_inscribed}</span>}
          </div>
          <h2 className="text-[17px] font-semibold text-gray-900 leading-snug">{site.name}</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">{countryFlag(site.country)} {site.country}</p>
        </div>

        {/* Description */}
        {site.short_description && (
          <p className="text-[13px] text-gray-600 leading-relaxed">{site.short_description}</p>
        )}

        {/* Location */}
        {site.lat != null && site.lng != null && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Location</p>
            <p className="text-[12px] text-gray-700">{site.lat.toFixed(4)}, {site.lng.toFixed(4)}</p>
            <a
              href={`https://www.google.com/maps?q=${site.lat},${site.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1.5 text-[12px] text-blue-600 hover:text-blue-700"
            >
              Open in Maps
            </a>
          </div>
        )}

        {/* Visit info */}
        {visited && (
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
            <p className="text-[11px] font-medium text-blue-600 mb-1">Visited</p>
            {site.visited_date && (
              <p className="text-[12px] text-blue-800">
                {new Date(site.visited_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {site.visit_notes && <p className="text-[12px] text-blue-700 mt-1">{site.visit_notes}</p>}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onToggle(site)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium rounded-xl transition-colors ${
              visited
                ? 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                : 'text-white bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {visited ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Edit visit
              </>
            ) : 'Mark as visited'}
          </button>

          {site.unesco_url && (
            <a
              href={site.unesco_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              UNESCO
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main UnescoTracker                                                 */
/* ------------------------------------------------------------------ */

export function UnescoTracker() {
  const [sites, setSites] = useState<UnescoSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSites, setTotalSites] = useState(0);
  const [visitedCount, setVisitedCount] = useState(0);
  const [regions, setRegions] = useState<string[]>([]);

  const [filterRegion, setFilterRegion] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterVisited, setFilterVisited] = useState<'all' | 'visited' | 'unvisited'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const [view, setView] = useState<View>('countries');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedSite, setSelectedSite] = useState<UnescoSite | null>(null);
  const [visitModalSite, setVisitModalSite] = useState<UnescoSite | null>(null);

  /* ---------- Data fetching ---------- */

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '2000', offset: '0' });
      if (filterRegion) params.set('region', filterRegion);
      if (filterCategory) params.set('category', filterCategory);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/unesco/sites?${params}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();

      let fetchedSites: UnescoSite[] = data.sites || [];
      if (filterVisited === 'visited') fetchedSites = fetchedSites.filter(s => s.visit_id);
      else if (filterVisited === 'unvisited') fetchedSites = fetchedSites.filter(s => !s.visit_id);

      setSites(fetchedSites);
      setTotalSites(data.total || 0);
      setVisitedCount(data.visited_count || 0);
      if (data.filters?.regions) setRegions(data.filters.regions);
    } catch (e) {
      console.error('Failed to fetch UNESCO sites:', e);
    } finally {
      setLoading(false);
    }
  }, [filterRegion, filterCategory, filterVisited, debouncedSearch]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  /* ---------- Country grouping ---------- */

  const countrySummaries = useMemo(() => {
    const map = new Map<string, CountrySummary>();
    for (const site of sites) {
      let entry = map.get(site.country);
      if (!entry) {
        entry = { country: site.country, flag: countryFlag(site.country), region: site.region, total: 0, visited: 0, sites: [] };
        map.set(site.country, entry);
      }
      entry.total++;
      if (site.visit_id) entry.visited++;
      entry.sites.push(site);
    }
    return Array.from(map.values()).sort((a, b) => a.country.localeCompare(b.country));
  }, [sites]);

  const countrySites = useMemo(() => {
    return countrySummaries.find(c => c.country === selectedCountry)?.sites || [];
  }, [countrySummaries, selectedCountry]);

  /* ---------- Visit handlers ---------- */

  const handleSaveVisit = async (siteId: number, date: string, notes: string) => {
    await fetch('/api/unesco/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, visited_date: date || null, notes: notes || null }),
    });
    const wasNew = !sites.find(s => s.id === siteId)?.visit_id;
    if (wasNew) setVisitedCount(prev => prev + 1);
    setSites(prev => prev.map(s => s.id === siteId
      ? { ...s, visit_id: s.visit_id || siteId, visited_date: date || null, visit_notes: notes || null }
      : s
    ));
    if (selectedSite?.id === siteId) {
      setSelectedSite(prev => prev ? { ...prev, visit_id: prev.visit_id || siteId, visited_date: date || null, visit_notes: notes || null } : null);
    }
  };

  const handleRemoveVisit = async (siteId: number) => {
    await fetch(`/api/unesco/visits?site_id=${siteId}`, { method: 'DELETE' });
    setVisitedCount(prev => Math.max(0, prev - 1));
    setSites(prev => prev.map(s => s.id === siteId ? { ...s, visit_id: null, visited_date: null, visit_notes: null } : s));
    if (selectedSite?.id === siteId) {
      setSelectedSite(prev => prev ? { ...prev, visit_id: null, visited_date: null, visit_notes: null } : null);
    }
  };

  /* ---------- Navigation ---------- */

  const openCountry = (country: string) => {
    setSelectedCountry(country);
    setView('country-sites');
  };

  const openSite = (site: UnescoSite) => {
    setSelectedSite(site);
    setView('site-detail');
  };

  const goBack = () => {
    if (view === 'site-detail') { setView('country-sites'); setSelectedSite(null); }
    else if (view === 'country-sites') { setView('countries'); setSelectedCountry(''); }
  };

  const progressPct = totalSites > 0 ? Math.round((visitedCount / totalSites) * 100) : 0;

  /* ---------- Site Detail View ---------- */

  if (view === 'site-detail' && selectedSite) {
    return (
      <div className="flex flex-col min-h-full pb-6">
        <SiteDetail
          site={selectedSite}
          onBack={goBack}
          onToggle={s => setVisitModalSite(s)}
        />
        {visitModalSite && (
          <VisitModal
            site={visitModalSite}
            onSave={handleSaveVisit}
            onRemove={handleRemoveVisit}
            onClose={() => setVisitModalSite(null)}
          />
        )}
      </div>
    );
  }

  /* ---------- Country Sites View ---------- */

  if (view === 'country-sites' && selectedCountry) {
    const summary = countrySummaries.find(c => c.country === selectedCountry);
    return (
      <div className="flex flex-col min-h-full pb-6">
        <button onClick={goBack} className="flex items-center gap-1.5 px-4 pt-3 pb-1 text-[13px] text-gray-500 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          All countries
        </button>

        <div className="px-4 pt-2 pb-3">
          <h2 className="text-[17px] font-semibold text-gray-900">
            {summary?.flag} {selectedCountry}
          </h2>
          <p className="text-[12px] text-gray-400 mt-0.5">
            {summary?.visited || 0} of {summary?.total || 0} sites visited
          </p>
        </div>

        <div className="px-4 space-y-1.5">
          {countrySites.map(site => {
            const visited = !!site.visit_id;
            return (
              <button
                key={site.id}
                onClick={() => openSite(site)}
                className={`w-full text-left px-3.5 py-3 rounded-xl border transition-colors ${
                  visited ? 'border-blue-100 bg-blue-50/40' : 'border-gray-100 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: categoryDot(site.category) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 leading-snug">{site.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400 capitalize">{site.category}</span>
                      {site.year_inscribed && <span className="text-[11px] text-gray-400">{site.year_inscribed}</span>}
                    </div>
                    {visited && site.visited_date && (
                      <p className="text-[11px] text-blue-600 mt-0.5">
                        Visited {new Date(site.visited_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {visited && (
                    <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                  <svg className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---------- Countries List View (default) ---------- */

  return (
    <div className="flex flex-col min-h-full pb-6">
      {/* Header + progress */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-[18px] font-semibold text-gray-900">UNESCO Sites</h1>
          <span className="text-[13px] font-medium text-blue-600">
            {visitedCount} / {totalSites} visited
          </span>
        </div>

        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400 text-right">{progressPct}%</p>
      </div>

      {/* Search */}
      <div className="px-4 mb-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search sites, countries..."
            className="w-full pl-8 pr-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-1.5 mb-3">
        <div className="flex gap-1.5 px-4 overflow-x-auto scrollbar-none">
          {(['all', 'visited', 'unvisited'] as const).map(v => (
            <button
              key={v}
              onClick={() => setFilterVisited(v)}
              className={`shrink-0 px-3 py-1 text-[12px] font-medium rounded-full transition-colors ${
                filterVisited === v ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {v === 'all' ? 'All' : v === 'visited' ? 'Visited' : 'Not yet'}
            </button>
          ))}
          <div className="w-px h-5 bg-gray-200 self-center mx-0.5 shrink-0" />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
              className={`shrink-0 px-3 py-1 text-[12px] font-medium rounded-full transition-colors capitalize ${
                filterCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {regions.length > 0 && (
          <div className="flex gap-1.5 px-4 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFilterRegion('')}
              className={`shrink-0 px-3 py-1 text-[12px] font-medium rounded-full transition-colors ${
                !filterRegion ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              All regions
            </button>
            {regions.map(r => (
              <button
                key={r}
                onClick={() => setFilterRegion(filterRegion === r ? '' : r)}
                className={`shrink-0 px-3 py-1 text-[12px] font-medium rounded-full transition-colors ${
                  filterRegion === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Country list */}
      <div className="px-4 space-y-1">
        {loading && sites.length === 0 ? (
          <>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 rounded-xl bg-gray-50 border border-gray-100 animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
            ))}
          </>
        ) : countrySummaries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[13px] text-gray-400">
              {totalSites === 0
                ? 'No sites loaded yet. Run the seed script to import UNESCO data.'
                : 'No countries match your filters.'}
            </p>
          </div>
        ) : (
          countrySummaries.map(c => (
            <button
              key={c.country}
              onClick={() => openCountry(c.country)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-[18px] leading-none shrink-0" style={{ minWidth: '1.5rem', textAlign: 'center' }}>
                {c.flag || '\u{1F30D}'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900 truncate">{c.country}</p>
                <p className="text-[11px] text-gray-400">{c.region}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-medium text-gray-700">
                  {c.visited > 0 && <span className="text-blue-600">{c.visited}/</span>}{c.total}
                </p>
                <p className="text-[10px] text-gray-400">{c.total === 1 ? 'site' : 'sites'}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ))
        )}
      </div>

      {/* Visit modal */}
      {visitModalSite && (
        <VisitModal
          site={visitModalSite}
          onSave={handleSaveVisit}
          onRemove={handleRemoveVisit}
          onClose={() => setVisitModalSite(null)}
        />
      )}
    </div>
  );
}
