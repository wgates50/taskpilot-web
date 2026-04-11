'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlanningScreen } from '@/components/PlanningScreen';
import { EventCard } from '@/components/cards/EventCard';

type CalendarMode = 'personal' | 'whats-on' | 'planner';

interface CachedEvent {
  id: string;
  title: string;
  venue: string | null;
  date_start: string | null;
  date_end: string | null;
  category: string | null;
  price: string | null;
  url: string | null;
  calendar_link: string | null;
  tags: string[];
  reason: string | null;
  closing_date: string | null;
  score: number | null;
  status: string;
}

function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatEventTime(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return null;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ── Personal Calendar Mode ────────────────────────────────

function PersonalCalendarMode() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </div>
      <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5">Personal Calendar</h3>
      <p className="text-[13px] text-gray-500 leading-relaxed max-w-[260px]">
        Your Google Calendar events will appear here once the integration is connected.
      </p>
      <div className="mt-6 w-full max-w-[300px] space-y-2.5">
        <div className="h-10 rounded-xl bg-gray-50 border border-gray-100 animate-pulse" />
        <div className="h-10 rounded-xl bg-gray-50 border border-gray-100 animate-pulse opacity-70" />
        <div className="h-10 rounded-xl bg-gray-50 border border-gray-100 animate-pulse opacity-40" />
      </div>
      <p className="text-[11px] text-gray-300 mt-6">Google Calendar integration coming soon</p>
    </div>
  );
}

// ── What's On Mode ────────────────────────────────────────

function WhatsOnMode() {
  const [events, setEvents] = useState<CachedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 90 * 86400000).toISOString(); // 90 days ahead
      const res = await fetch(`/api/events?from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('Failed to fetch events:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Build category list from events
  const categories = Array.from(new Set(events.map(e => e.category).filter(Boolean))) as string[];

  const filtered = filter === 'all' ? events : events.filter(e => e.category === filter);

  // Group by week
  const grouped: Record<string, CachedEvent[]> = {};
  for (const event of filtered) {
    const d = event.date_start ? new Date(event.date_start) : null;
    let label = 'Upcoming';
    if (d && !isNaN(d.getTime())) {
      const now = new Date();
      const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
      if (diff < 0) label = 'Past';
      else if (diff < 7) label = 'This week';
      else if (diff < 14) label = 'Next week';
      else {
        label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      }
    }
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(event);
  }

  const groupOrder = ['This week', 'Next week'];
  const sortedGroups = [
    ...groupOrder.filter(g => grouped[g]),
    ...Object.keys(grouped).filter(g => !groupOrder.includes(g) && g !== 'Past' && g !== 'Upcoming'),
    ...(grouped['Upcoming'] ? ['Upcoming'] : []),
    ...(grouped['Past'] ? ['Past'] : []),
  ];

  if (loading) {
    return (
      <div className="px-4 py-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-gray-50 border border-gray-100 animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <p className="text-[13px] text-gray-500">No upcoming events found.</p>
        <p className="text-[11px] text-gray-400 mt-1">Events are added by the What&apos;s On scanner.</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilter('all')}
            className={`shrink-0 px-3 py-1 text-[12px] font-medium rounded-full transition-colors ${
              filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`shrink-0 px-3 py-1 text-[12px] font-medium rounded-full transition-colors capitalize ${
                filter === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grouped event list */}
      <div className="px-4 space-y-5">
        {sortedGroups.map(group => (
          <div key={group}>
            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{group}</h3>
            <div className="space-y-2">
              {grouped[group].map(event => (
                <EventCard
                  key={event.id}
                  data={{
                    title: event.title,
                    venue: event.venue || undefined,
                    date: formatEventDate(event.date_start),
                    time: formatEventTime(event.date_start) || undefined,
                    price: event.price || undefined,
                    reason: event.reason || undefined,
                    tags: event.tags || [],
                    url: event.url || undefined,
                    booking_url: event.calendar_link || undefined,
                    category: event.category || undefined,
                    in_calendar: false,
                    item_key: `event:${event.id}`,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CalendarScreen ────────────────────────────────────────

const MODES: { id: CalendarMode; label: string }[] = [
  { id: 'personal', label: 'My Calendar' },
  { id: 'whats-on', label: "What's On" },
  { id: 'planner', label: 'Planner' },
];

export function CalendarScreen() {
  const [mode, setMode] = useState<CalendarMode>('whats-on');

  return (
    <div className="flex flex-col h-full">
      {/* Header with mode switcher */}
      <div className="px-4 pt-4 pb-0 shrink-0">
        <h1 className="text-[18px] font-semibold text-gray-900 mb-3">Calendar</h1>
        <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 py-1.5 text-[12px] font-medium rounded-[10px] transition-all ${
                mode === m.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {/* Mode description */}
        <p className="text-[11px] text-gray-400 mt-2 mb-3">
          {mode === 'personal' && 'Your personal events and meetings'}
          {mode === 'whats-on' && 'Events in London you might want to attend'}
          {mode === 'planner' && 'Activity suggestions for your free time'}
        </p>
      </div>

      {/* Mode content */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'personal' && <PersonalCalendarMode />}
        {mode === 'whats-on' && <WhatsOnMode />}
        {mode === 'planner' && <PlanningScreen />}
      </div>
    </div>
  );
}
