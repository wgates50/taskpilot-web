'use client';

import { useState, useEffect } from 'react';
import { TASKS, TASK_GROUPS, type TaskMeta } from '@/lib/tasks';

// ── Types ────────────────────────────────────────────────

type ProfileView = 'home' | 'taste-profile' | 'places-db' | 'task-detail';

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

interface GoogleStatus {
  connected: boolean;
  scope?: string;
  expiresAt?: number;
  error?: string;
}

// ── Main Component ───────────────────────────────────────

export function ProfileScreen() {
  const [view, setView] = useState<ProfileView>('home');
  const [selectedTask, setSelectedTask] = useState<TaskMeta | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [googleBanner, setGoogleBanner] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const g = new URLSearchParams(window.location.search).get('google');
    return g ? (g === 'connected' ? '✓ Google Calendar connected' : `Google Calendar error: ${g}`) : null;
  });

  useEffect(() => {
    fetch('/api/auth/google/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setGoogleStatus(data))
      .catch(() => {});

    // Clean up OAuth redirect param from URL and schedule auto-dismiss
    if (typeof window !== 'undefined') {
      const g = new URLSearchParams(window.location.search).get('google');
      if (g) {
        const url = new URL(window.location.href);
        url.searchParams.delete('google');
        window.history.replaceState({}, '', url.toString());
        window.setTimeout(() => setGoogleBanner(null), 6000);
      }
    }
  }, []);

  if (view === 'taste-profile') {
    return <TasteProfileView onBack={() => setView('home')} />;
  }

  if (view === 'places-db') {
    return <PlacesDBView onBack={() => setView('home')} />;
  }

  if (view === 'task-detail' && selectedTask) {
    return <TaskDetailView task={selectedTask} onBack={() => { setSelectedTask(null); setView('home'); }} />;
  }

  // Group active tasks by group
  const activeTasks = TASKS.filter(t => !t.retired && !t.hideFromThreads);
  const backgroundTasks = TASKS.filter(t => !t.retired && (t.hideFromThreads || t.tier === 'background'));

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b px-4 pt-12 lg:pt-4 pb-3 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Features, connections & preferences</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-24">
        {/* Google Calendar banner */}
        {googleBanner && (
          <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-[12px] text-blue-700">
            {googleBanner}
          </div>
        )}

        {/* Desktop: two-column grid for top sections */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6">
          <div>
            {/* ── Connections ── */}
            <SectionHeader label="Connections" />
            <div className="space-y-1.5">
              <SettingsRow
                icon="📅"
                title="Google Calendar"
                subtitle={googleStatus?.connected ? 'Connected' : 'Not connected'}
                trailing={googleStatus?.connected ? (
                  <span className="text-[11px] text-green-600 font-medium">✓</span>
                ) : (
                  <a
                    href="/api/auth/google/consent"
                    className="text-[11px] font-medium text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    Connect
                  </a>
                )}
              />
            </div>

            {/* ── Data & Preferences ── */}
            <SectionHeader label="Data & Preferences" />
            <div className="space-y-1.5">
              <SettingsRow
                icon="🎯"
                title="Taste Profile"
                subtitle="Interests, venues & evidence log"
                onClick={() => setView('taste-profile')}
                trailing={<ChevronRight />}
              />
              <SettingsRow
                icon="📍"
                title="Places Database"
                subtitle="290 places — restaurants, cafes, activities"
                onClick={() => setView('places-db')}
                trailing={<ChevronRight />}
              />
            </div>
          </div>

          <div>
            {/* ── Features ── */}
            <SectionHeader label="Features" />
            <div className="space-y-1.5">
              {activeTasks.map(task => (
                <SettingsRow
                  key={task.id}
                  icon={task.icon}
                  title={task.name}
                  subtitle={task.schedule}
                  onClick={() => { setSelectedTask(task); setView('task-detail'); }}
                  trailing={<ChevronRight />}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Background Pipelines — full width below on desktop */}
        <SectionHeader label="Background Pipelines" />
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-1.5">
          {backgroundTasks.map(task => (
            <SettingsRow
              key={task.id}
              icon={task.icon}
              title={task.name}
              subtitle={task.schedule}
              onClick={() => { setSelectedTask(task); setView('task-detail'); }}
              trailing={<ChevronRight />}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shared UI ────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mt-5 mb-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
        {label}
      </p>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onClick,
  trailing,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3.5 py-3 shadow-sm ${
        onClick ? 'hover:bg-gray-50 active:bg-gray-100 transition-colors text-left' : ''
      }`}
    >
      <span className="text-lg shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-900 truncate">{title}</p>
        <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </Tag>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="flex items-center gap-1 text-blue-600 text-sm font-medium mb-0.5">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
      Back
    </button>
  );
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

// ── Task Detail View ─────────────────────────────────────

function TaskDetailView({ task, onBack }: { task: TaskMeta; onBack: () => void }) {
  const group = TASK_GROUPS[task.group];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b px-4 pt-12 lg:pt-4 pb-3 shrink-0">
        <BackButton onBack={onBack} />
        <div className="flex items-center gap-2.5 mt-1">
          <span className="text-2xl">{task.icon}</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{task.name}</h1>
            {group && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: group.color + '15', color: group.color }}>
                {group.name}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <div className="mt-4 space-y-3">
          <InfoRow label="Description" value={task.description} />
          <InfoRow label="Schedule" value={task.schedule} />
          <InfoRow label="Cron" value={task.cronExpression || '—'} />
          <InfoRow label="Tier" value={task.tier} />
          {task.dependencies.length > 0 && (
            <InfoRow label="Depends on" value={task.dependencies.join(', ')} />
          )}
          {task.dependents.length > 0 && (
            <InfoRow label="Feeds into" value={task.dependents.join(', ')} />
          )}
          {task.retired && (
            <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-[12px] text-amber-700">
              This task is retired and no longer runs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3.5 py-2.5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-[13px] text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}

// ── Taste Profile View ───────────────────────────────────

function TasteProfileView({ onBack }: { onBack: () => void }) {
  type Tab = 'interests' | 'venues' | 'evidence';
  const [tab, setTab] = useState<Tab>('interests');
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b px-4 pt-12 lg:pt-4 pb-3 shrink-0">
        <BackButton onBack={onBack} />
        <h1 className="text-lg font-bold text-gray-900 mt-1">Taste Profile</h1>
        <p className="text-xs text-gray-400 mt-0.5">Your preferences — shared across all tasks</p>

        <div className="flex mt-3 bg-gray-100 rounded-md p-0.5">
          {(['interests', 'venues', 'evidence'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors capitalize ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading...</div>
        ) : tab === 'interests' ? (
          <div className="mt-3 space-y-3 lg:max-w-2xl">
            <p className="text-[11px] text-gray-400">
              Tap stars to adjust confidence. Tasks use these for recommendations.
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
        ) : tab === 'venues' ? (
          <div className="mt-3 space-y-2">
            {venues.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                No venues yet. They&apos;ll appear as the Activity Engine tracks your visits.
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
        ) : (
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
      </div>
    </div>
  );
}

// ── Places DB View ───────────────────────────────────────

function PlacesDBView({ onBack }: { onBack: () => void }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [area, setArea] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/places?limit=500')
      .then(r => r.ok ? r.json() : { places: [] })
      .then(data => setPlaces(data.places || []))
      .catch(e => console.error('Failed to fetch places:', e))
      .finally(() => setLoading(false));
  }, []);

  const categories = Array.from(new Set(places.map(p => p.category).filter((c): c is string => !!c))).sort();
  const areas = Array.from(new Set(places.map(p => p.area).filter((a): a is string => !!a))).sort();

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
  const taggedCount = places.filter(p => p.vibe_tags && p.vibe_tags.length > 0).length;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b px-4 pt-12 lg:pt-4 pb-3 shrink-0">
        <BackButton onBack={onBack} />
        <h1 className="text-lg font-bold text-gray-900 mt-1">Places Database</h1>
        <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
          <span>{places.length} total</span>
          <span>&middot;</span>
          <span>{enrichedCount} enriched</span>
          <span>&middot;</span>
          <span>{taggedCount} tagged</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading places...</div>
        ) : (
          <div className="mt-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, area, address..."
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md mb-2 focus:outline-none focus:border-blue-400"
            />
            <div className="flex gap-2 mb-3">
              <select value={category} onChange={e => setCategory(e.target.value)} className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 rounded-md bg-white">
                <option value="all">All categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={area} onChange={e => setArea(e.target.value)} className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 rounded-md bg-white">
                <option value="all">All areas</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <p className="text-[11px] text-gray-400 mb-1">Showing {filtered.length} of {places.length}</p>
            <div className="space-y-1 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-2 lg:space-y-0">
              {filtered.map(p => {
                const isOpen = expanded === p.id;
                return (
                  <div key={p.id} className="border border-gray-100 rounded-md px-2.5 py-2 bg-white">
                    <button onClick={() => setExpanded(isOpen ? null : p.id)} className="w-full text-left">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-gray-800 truncate">{p.name}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                            {p.category && <span>{p.category}</span>}
                            {p.area && <><span>&middot;</span><span>{p.area}</span></>}
                            {typeof p.google_rating === 'number' && <><span>&middot;</span><span>★ {p.google_rating.toFixed(1)}</span></>}
                          </div>
                        </div>
                        <span className="text-gray-300 text-xs">{isOpen ? '−' : '+'}</span>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-[11px] text-gray-500">
                        {p.address && <p>{p.address}</p>}
                        {p.price_tier && <p>Price: {p.price_tier}</p>}
                        {p.lat !== null && p.lng !== null && <p>Coords: {p.lat.toFixed(4)}, {p.lng.toFixed(4)}</p>}
                        {renderTags('Vibe', p.vibe_tags)}
                        {renderTags('Weather', p.weather_tags)}
                        {renderTags('Time', p.time_tags)}
                        {renderTags('Social', p.social_tags)}
                        {renderTags('Day', p.day_tags)}
                        {renderTags('Season', p.season_tags)}
                        {(p.times_suggested !== null || p.times_visited !== null) && (
                          <p className="text-gray-400">Suggested {p.times_suggested || 0}× · Visited {p.times_visited || 0}×</p>
                        )}
                        {p.google_maps_url && (
                          <a href={p.google_maps_url} target="_blank" rel="noopener noreferrer" className="inline-block text-blue-500 hover:underline">
                            Open in Google Maps ↗
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
        <span key={t} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">{t}</span>
      ))}
    </div>
  );
}
