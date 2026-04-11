'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
  wiki_url: string | null;
  // joined from visits
  visit_id: number | null;
  visited_date: string | null;
  visit_notes: string | null;
}

interface VisitModalProps {
  site: UnescoSite;
  onSave: (siteId: number, date: string, notes: string) => Promise<void>;
  onRemove: (siteId: number) => Promise<void>;
  onClose: () => void;
}

function VisitModal({ site, onSave, onRemove, onClose }: VisitModalProps) {
  const [date, setDate] = useState(site.visited_date ? site.visited_date.split('T')[0] : '');
  const [notes, setNotes] = useState(site.visit_notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(site.id, date, notes);
    setSaving(false);
    onClose();
  };

  const handleRemove = async () => {
    setSaving(true);
    await onRemove(site.id);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[430px] bg-white rounded-t-2xl shadow-2xl p-5 pb-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        <h3 className="text-[15px] font-semibold text-gray-900 mb-0.5">{site.name}</h3>
        <p className="text-[12px] text-gray-500 mb-4">{site.country} · {site.category}</p>

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
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How was it? Any memories to capture..."
              rows={3}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 text-[13px] font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : site.visit_id ? 'Update visit' : 'Mark as visited'}
          </button>
          {site.visit_id && (
            <button
              onClick={handleRemove}
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

const REGIONS = [
  'Africa',
  'Arab States',
  'Asia and the Pacific',
  'Europe and North America',
  'Latin America and the Caribbean',
];

const CATEGORIES = ['cultural', 'natural', 'mixed'];

function categoryColor(cat: string) {
  if (cat === 'natural') return 'bg-green-100 text-green-700';
  if (cat === 'mixed') return 'bg-purple-100 text-purple-700';
  return 'bg-amber-100 text-amber-700';
}

function SiteCard({ site, onToggle }: { site: UnescoSite; onToggle: (site: UnescoSite) => void }) {
  const visited = !!site.visit_id;

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        visited ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-white'
      }`}
    >
      {/* Image strip */}
      {site.image_url && (
        <div className="relative h-28 bg-gray-100">
          <img
            src={site.image_url}
            alt={site.name}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {visited && (
            <div className="absolute inset-0 bg-blue-900/20 flex items-center justify-center">
              <div className="bg-white/90 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-[10px] font-semibold text-blue-700">Visited</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="px-3.5 py-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {/* Category + year */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${categoryColor(site.category)}`}>
                {site.category}
              </span>
              {site.year_inscribed && (
                <span className="text-[10px] text-gray-400">{site.year_inscribed}</span>
              )}
            </div>
            <p className="text-[13px] font-semibold text-gray-900 leading-snug">{site.name}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{site.country}</p>
            {site.short_description && (
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-2">{site.short_description}</p>
            )}
            {visited && site.visited_date && (
              <p className="text-[11px] text-blue-600 mt-1">
                Visited {new Date(site.visited_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* Visited toggle (no image fallback) */}
          {!site.image_url && visited && (
            <div className="shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-2.5">
          <button
            onClick={() => onToggle(site)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
              visited
                ? 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {visited ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Visited
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Mark visited
              </>
            )}
          </button>

          {site.unesco_url && (
            <a
              href={site.unesco_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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

export function UnescoTracker() {
  const [sites, setSites] = useState<UnescoSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSites, setTotalSites] = useState(0);
  const [visitedCount, setVisitedCount] = useState(0);
  const [regions, setRegions] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);

  const [filterRegion, setFilterRegion] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterVisited, setFilterVisited] = useState<'all' | 'visited' | 'unvisited'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const [selectedSite, setSelectedSite] = useState<UnescoSite | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 50;

  const fetchSites = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(currentPage * LIMIT),
      });
      if (filterRegion) params.set('region', filterRegion);
      if (filterCategory) params.set('category', filterCategory);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/unesco/sites?${params}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();

      let fetchedSites: UnescoSite[] = data.sites || [];

      // Client-side filter for visited/unvisited
      if (filterVisited === 'visited') {
        fetchedSites = fetchedSites.filter(s => s.visit_id);
      } else if (filterVisited === 'unvisited') {
        fetchedSites = fetchedSites.filter(s => !s.visit_id);
      }

      if (reset || currentPage === 0) {
        setSites(fetchedSites);
      } else {
        setSites(prev => [...prev, ...fetchedSites]);
      }

      setTotalSites(data.total || 0);
      setVisitedCount(data.visited_count || 0);
      setHasMore((currentPage + 1) * LIMIT < (data.total || 0));
      if (data.filters?.regions) setRegions(data.filters.regions);
      if (data.filters?.countries) setCountries(data.filters.countries);
    } catch (e) {
      console.error('Failed to fetch UNESCO sites:', e);
    } finally {
      setLoading(false);
    }
  }, [filterRegion, filterCategory, filterVisited, debouncedSearch, page]);

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  // Refetch on filter changes
  useEffect(() => {
    setPage(0);
    fetchSites(true);
  }, [filterRegion, filterCategory, filterVisited, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleVisit = (site: UnescoSite) => {
    setSelectedSite(site);
  };

  const handleSaveVisit = async (siteId: number, date: string, notes: string) => {
    await fetch('/api/unesco/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, visited_date: date || null, notes: notes || null }),
    });
    setVisitedCount(prev => selectedSite?.visit_id ? prev : prev + 1);
    setSites(prev => prev.map(s => s.id === siteId
      ? { ...s, visit_id: s.visit_id || siteId, visited_date: date || null, visit_notes: notes || null }
      : s
    ));
  };

  const handleRemoveVisit = async (siteId: number) => {
    await fetch(`/api/unesco/visits?site_id=${siteId}`, { method: 'DELETE' });
    setVisitedCount(prev => Math.max(0, prev - 1));
    setSites(prev => prev.map(s => s.id === siteId
      ? { ...s, visit_id: null, visited_date: null, visit_notes: null }
      : s
    ));
  };

  const progressPct = totalSites > 0 ? Math.round((visitedCount / totalSites) * 100) : 0;

  return (
    <div className="flex flex-col min-h-full pb-6">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-[18px] font-semibold text-gray-900">UNESCO Sites</h1>
          <span className="text-[13px] font-medium text-blue-600">
            {visitedCount} / {totalSites}
          </span>
        </div>
        <p className="text-[12px] text-gray-400 mb-3">
          World Heritage Sites visited
        </p>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400 text-right">{progressPct}% complete</p>
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
        {/* Visited filter */}
        <div className="flex gap-1.5 px-4 overflow-x-auto scrollbar-none">
          {(['all', 'visited', 'unvisited'] as const).map(v => (
            <button
              key={v}
              onClick={() => setFilterVisited(v)}
              className={`shrink-0 px-3 py-1 text-[12px] font-medium rounded-full transition-colors capitalize ${
                filterVisited === v ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {v === 'all' ? 'All sites' : v === 'visited' ? 'Visited' : 'Not yet'}
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

        {/* Region filter */}
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

      {/* Site list */}
      <div className="px-4 space-y-3">
        {loading && sites.length === 0 ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-gray-50 border border-gray-100 animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
            ))}
          </>
        ) : sites.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[13px] text-gray-400">
              {totalSites === 0
                ? 'No sites loaded yet. Run the seed script to import UNESCO data.'
                : 'No sites match your filters.'}
            </p>
          </div>
        ) : (
          <>
            {sites.map(site => (
              <SiteCard key={site.id} site={site} onToggle={handleToggleVisit} />
            ))}

            {hasMore && (
              <button
                onClick={() => { setPage(p => p + 1); fetchSites(); }}
                disabled={loading}
                className="w-full py-3 text-[13px] font-medium text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Visit modal */}
      {selectedSite && (
        <VisitModal
          site={selectedSite}
          onSave={handleSaveVisit}
          onRemove={handleRemoveVisit}
          onClose={() => setSelectedSite(null)}
        />
      )}
    </div>
  );
}
