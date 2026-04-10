'use client';

import { useState, useEffect } from 'react';

type ProfileTab = 'interests' | 'venues' | 'evidence' | 'places';

interface Interest {
  name: string;
  confidence: number;
  evidence: string;
}

interface Venue {
  name: string;
  type: string;
  frequency: string;
}

interface EvidenceEntry {
  id: number;
  task_id: string;
  type: string;
  detail: string;
  logged_at: string;
  flagged: boolean;
}

interface Place {
  id: string;
  name: string;
  category: string | null;
  area: string | null;
  address: string | null;
  google_rating: number | null;
  price_tier: string | null;
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
  google_maps_url: string | null;
  vibe_tags: string[] | null;
  weather_tags: string[] | null;
  time_tags: string[] | null;
  social_tags: string[] | null;
  day_tags: string[] | null;
  season_tags: string[] | null;
  times_suggested: number | null;
  times_visited: number | null;
  last_suggested: string | null;
}

export function ProfileScreen() {
  const [tab, setTab] = useState<ProfileTab>('interests');
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Places tab state
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesLoaded, setPlacesLoaded] = useState(false);
  const [placeSearch, setPlaceSearch] = useState('');
  const [placeCategory, setPlaceCategory] = useState<string>('all');
  const [placeArea, setPlaceArea] = useState<string>('all');
  const [expandedPlace, setExpandedPlace] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, evidenceRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/profile/evidence?limit=30'),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data.profile);
        }
        if (evidenceRes.ok) {
          const data = await evidenceRes.json();
          setEvidence(data.log || []);
        }
      } catch (e) {
        console.error('Failed to fetch profile:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Lazy-load places when the tab is first opened
  useEffect(() => {
    if (tab !== 'places' || placesLoaded) return;
    setPlacesLoading(true);
    fetch('/api/places?limit=500')
      .then(r => (r.ok ? r.json() : { places: [] }))
      .then(data => {
        setPlaces(data.places || []);
        setPlacesLoaded(true);
      })
      .catch(e => console.error('Failed to fetch places:', e))
      .finally(() => setPlacesLoading(false));
  }, [tab, placesLoaded]);

  const interests = (profile?.interests as Interest[]) || [];
  const venues = (profile?.venues as Venue[]) || [];

  const updateInterestConfidence = async (name: string, newConf: number) => {
    if (!profile) return;
    const updated = interests.map(i =>
      i.name === name ? { ...i, confidence: newConf } : i
    );
    const newProfile = { ...profile, interests: updated };
    setProfile(newProfile);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: newProfile }),
      });
    } catch (e) {
      console.error('Failed to update profile:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-5 pt-4 pb-3 sticky top-0 z-10 bg-white">
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900">Profile</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Your taste profile — shared across all tasks
        </p>

        {/* Tabs */}
        <div className="flex mt-3 bg-gray-100 rounded-lg p-0.5">
          {(['interests', 'venues', 'evidence', 'places'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors capitalize ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t === 'evidence' ? 'Evidence' : t === 'places' ? 'Places DB' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {tab === 'interests' && (
          <div className="mt-3 space-y-3">
            <p className="text-[11px] text-gray-400">
              Tap stars to adjust confidence. Tasks use these rankings for recommendations.
            </p>
            {interests.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                No interests yet. They&apos;ll appear as tasks learn your preferences.
              </p>
            ) : (
              interests.map(interest => (
                <div key={interest.name} className="border-b border-gray-50 pb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium text-gray-800">{interest.name}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          onClick={() => updateInterestConfidence(interest.name, n)}
                          className="text-lg leading-none"
                        >
                          {n <= interest.confidence ? '\u2B50' : '\u2606'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {interest.evidence && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{interest.evidence}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'venues' && (
          <div className="mt-3 space-y-2">
            {venues.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                No venues yet. They&apos;ll appear as the Activity Suggester tracks your visits.
              </p>
            ) : (
              venues.map(v => (
                <div key={v.name} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-[13px] font-medium text-gray-800">{v.name}</p>
                    <p className="text-[11px] text-gray-400">{v.type}</p>
                  </div>
                  <span className="text-[11px] text-gray-400">{v.frequency}</span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'evidence' && (
          <div className="mt-3 space-y-2">
            {evidence.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                No evidence logged yet. Tasks will record learnings about your preferences here.
              </p>
            ) : (
              evidence.map(entry => (
                <div key={entry.id} className="border-l-2 border-blue-200 pl-3 py-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <span>{new Date(entry.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    <span>&middot;</span>
                    <span className="font-medium text-blue-500">{entry.task_id}</span>
                  </div>
                  <p className="text-[12px] text-gray-700 mt-0.5">{entry.detail}</p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'places' && (
          <PlacesPanel
            places={places}
            loading={placesLoading}
            search={placeSearch}
            setSearch={setPlaceSearch}
            category={placeCategory}
            setCategory={setPlaceCategory}
            area={placeArea}
            setArea={setPlaceArea}
            expanded={expandedPlace}
            setExpanded={setExpandedPlace}
          />
        )}
      </div>
    </div>
  );
}

interface PlacesPanelProps {
  places: Place[];
  loading: boolean;
  search: string;
  setSearch: (s: string) => void;
  category: string;
  setCategory: (s: string) => void;
  area: string;
  setArea: (s: string) => void;
  expanded: string | null;
  setExpanded: (s: string | null) => void;
}

function PlacesPanel({
  places,
  loading,
  search,
  setSearch,
  category,
  setCategory,
  area,
  setArea,
  expanded,
  setExpanded,
}: PlacesPanelProps) {
  if (loading) {
    return (
      <div className="mt-6 text-center text-gray-400 text-sm">Loading places...</div>
    );
  }
  if (places.length === 0) {
    return (
      <div className="mt-6 text-center text-gray-400 text-sm">
        No places in the database yet.
      </div>
    );
  }

  const categories = Array.from(
    new Set(places.map(p => p.category).filter((c): c is string => !!c))
  ).sort();
  const areas = Array.from(
    new Set(places.map(p => p.area).filter((a): a is string => !!a))
  ).sort();

  const q = search.trim().toLowerCase();
  const filtered = places.filter(p => {
    if (category !== 'all' && p.category !== category) return false;
    if (area !== 'all' && p.area !== area) return false;
    if (q) {
      const hay = [p.name, p.area, p.address, p.category].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const enrichedCount = places.filter(p => p.lat !== null).length;
  const taggedCount = places.filter(p => (p.vibe_tags && p.vibe_tags.length > 0)).length;

  return (
    <div className="mt-3">
      {/* Summary row */}
      <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-2">
        <span>{places.length} total</span>
        <span>&middot;</span>
        <span>{enrichedCount} enriched</span>
        <span>&middot;</span>
        <span>{taggedCount} tagged</span>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, area, address..."
        className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md mb-2 focus:outline-none focus:border-blue-400"
      />

      {/* Filters */}
      <div className="flex gap-2 mb-3">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 rounded-md bg-white"
        >
          <option value="all">All categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={area}
          onChange={e => setArea(e.target.value)}
          className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 rounded-md bg-white"
        >
          <option value="all">All areas</option>
          {areas.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <p className="text-[11px] text-gray-400 mb-1">
        Showing {filtered.length} of {places.length}
      </p>

      {/* List */}
      <div className="space-y-1">
        {filtered.map(p => {
          const isOpen = expanded === p.id;
          return (
            <div
              key={p.id}
              className="border border-gray-100 rounded-md px-2.5 py-2"
            >
              <button
                onClick={() => setExpanded(isOpen ? null : p.id)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-800 truncate">{p.name}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                      {p.category && <span>{p.category}</span>}
                      {p.area && <><span>&middot;</span><span>{p.area}</span></>}
                      {typeof p.google_rating === 'number' && (
                        <><span>&middot;</span><span>★ {p.google_rating.toFixed(1)}</span></>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-300 text-xs">{isOpen ? '−' : '+'}</span>
                </div>
              </button>
              {isOpen && (
                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-[11px] text-gray-500">
                  {p.address && <p>{p.address}</p>}
                  {p.price_tier && <p>Price: {p.price_tier}</p>}
                  {p.lat !== null && p.lng !== null && (
                    <p>Coords: {p.lat.toFixed(4)}, {p.lng.toFixed(4)}</p>
                  )}
                  {renderTags('Vibe', p.vibe_tags)}
                  {renderTags('Weather', p.weather_tags)}
                  {renderTags('Time', p.time_tags)}
                  {renderTags('Social', p.social_tags)}
                  {renderTags('Day', p.day_tags)}
                  {renderTags('Season', p.season_tags)}
                  {(p.times_suggested !== null || p.times_visited !== null) && (
                    <p className="text-gray-400">
                      Suggested {p.times_suggested || 0}× · Visited {p.times_visited || 0}×
                    </p>
                  )}
                  {p.google_maps_url && (
                    <a
                      href={p.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-blue-500 hover:underline"
                    >
                      Open in Google Maps ↗
                    </a>
                  )}
                  <p className="text-[10px] text-gray-300 font-mono truncate">id: {p.id}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderTags(label: string, tags: string[] | null | undefined) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-gray-400">{label}:</span>
      {tags.map(t => (
        <span key={t} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
          {t}
        </span>
      ))}
    </div>
  );
}
