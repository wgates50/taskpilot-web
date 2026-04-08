'use client';

import { useState, useEffect, useCallback } from 'react';

interface Suggestion {
  id: number;
  place_id: string;
  suggestion_date: string;
  suggested_for: string | null;
  score: number;
  scoring_reasons: Record<string, number>;
  status: string;
  name: string;
  category: string;
  subcategory: string;
  area: string | null;
  address: string | null;
  google_maps_url: string | null;
  website: string | null;
  google_rating: number | null;
  vibe_tags: string[];
  time_tags: string[];
  weather_tags: string[];
  social_tags: string[];
  price_tier: string | null;
  booking_type: string | null;
  duration: string | null;
  notes: string | null;
  times_visited: number;
  liked: boolean;
  cuisine_tags: string[];
}

interface CachedEvent {
  id: string;
  title: string;
  venue: string | null;
  date_start: string;
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

interface VisitReview {
  id: number;
  place_id: string | null;
  event_id: string | null;
  review_week: string;
  status: string;
  place_name?: string;
  place_category?: string;
  place_area?: string;
}

interface UserContext {
  location?: { area: string; lat: number; lng: number };
  companions?: { mode: string; detail: string | null };
}

const CATEGORY_EMOJI: Record<string, string> = {
  'Food & Drink': '🍽️',
  'Culture & Entertainment': '🎭',
  'Shopping & Markets': '🛍️',
  'Outdoors & Leisure': '🌳',
  'Wellness': '💆',
  art: '🎨', theatre: '🎭', markets: '🛍️', film: '🎬',
  music: '🎵', food: '🍽️', comedy: '🎤', history: '👑',
};

const BOOKING_LABELS: Record<string, { label: string; color: string }> = {
  'walk-in': { label: 'Walk-in', color: 'bg-green-100 text-green-700' },
  'booking-recommended': { label: 'Book ahead', color: 'bg-amber-100 text-amber-700' },
  'booking-required': { label: 'Booking required', color: 'bg-red-100 text-red-700' },
};

const COMPANION_OPTIONS = [
  { mode: 'solo', label: 'Solo', icon: '👤' },
  { mode: 'partner', label: 'Partner', icon: '💑' },
  { mode: 'friends', label: 'Friends', icon: '👥' },
  { mode: 'family', label: 'Family', icon: '👨‍👩‍👧' },
];

function getWeekDates(offset: number = 0): { dates: Date[]; label: string } {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }

  const sun = dates[6];
  const monthFmt = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' });
  const label = `${monday.getDate()} ${monthFmt(monday)} – ${sun.getDate()} ${monthFmt(sun)}`;

  return { dates, label };
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDayLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-GB', { weekday: 'long' });
}

export function PlanningScreen() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion[]>>({});
  const [events, setEvents] = useState<CachedEvent[]>([]);
  const [reviews, setReviews] = useState<VisitReview[]>([]);
  const [context, setContext] = useState<UserContext>({});
  const [loading, setLoading] = useState(true);
  const [rescoring, setRescoring] = useState(false);

  const { dates, label: weekLabel } = getWeekDates(weekOffset);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const from = formatDate(dates[0]);
      const to = formatDate(dates[6]);

      // Fetch suggestions for each day, events, context, and reviews in parallel
      const [eventsRes, contextRes, reviewsRes, ...dayResults] = await Promise.all([
        fetch(`/api/events?from=${from}T00:00:00Z&to=${to}T23:59:59Z`),
        fetch('/api/context'),
        fetch(`/api/visits?week=${from}`),
        ...dates.map(d => fetch(`/api/suggestions?date=${formatDate(d)}`)),
      ]);

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
      if (contextRes.ok) {
        const data = await contextRes.json();
        setContext(data.context || {});
      }
      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        setReviews(data.reviews || []);
      }

      const suggMap: Record<string, Suggestion[]> = {};
      for (let i = 0; i < dates.length; i++) {
        const dateKey = formatDate(dates[i]);
        if (dayResults[i].ok) {
          const data = await dayResults[i].json();
          suggMap[dateKey] = (data.suggestions || []).filter((s: Suggestion) => s.status !== 'dismissed');
        } else {
          suggMap[dateKey] = [];
        }
      }
      setSuggestions(suggMap);
    } catch (err) {
      console.error('Failed to fetch planning data:', err);
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (suggestionId: number, placeId: string, action: 'accepted' | 'dismissed') => {
    try {
      await fetch('/api/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: suggestionId, status: action, place_id: placeId }),
      });
      // Optimistic update
      setSuggestions(prev => {
        const updated = { ...prev };
        for (const key in updated) {
          updated[key] = updated[key].map(s =>
            s.id === suggestionId ? { ...s, status: action } : s
          ).filter(s => s.status !== 'dismissed');
        }
        return updated;
      });
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  const handleEventAction = async (eventId: string, action: 'accepted' | 'dismissed') => {
    try {
      await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, status: action }),
      });
      setEvents(prev => prev.filter(e => e.id !== eventId || action !== 'dismissed'));
    } catch (err) {
      console.error('Event action failed:', err);
    }
  };

  const handleReviewAction = async (reviewId: number, placeId: string | null, status: string) => {
    try {
      await fetch('/api/visits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reviewId, status, place_id: placeId }),
      });
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status } : r));
    } catch (err) {
      console.error('Review action failed:', err);
    }
  };

  const updateContext = async (key: string, value: unknown) => {
    try {
      await fetch('/api/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      setContext(prev => ({ ...prev, [key]: value }));
    } catch (err) {
      console.error('Context update failed:', err);
    }
  };

  const handleRescore = async () => {
    setRescoring(true);
    // For now, just refresh — real rescoring will use weather API client-side in the future
    await fetchData();
    setRescoring(false);
  };

  const pendingReviews = reviews.filter(r => r.status === 'pending');
  const activeEvents = events.filter(e => e.status !== 'dismissed');

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 pt-12 pb-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900">Planning</h1>
          <button
            onClick={handleRescore}
            disabled={rescoring}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-medium active:bg-blue-100 disabled:opacity-50"
          >
            <span className={rescoring ? 'animate-spin' : ''}>🔄</span>
            {rescoring ? 'Refreshing...' : 'Suggest Now'}
          </button>
        </div>

        {/* Week navigator */}
        <div className="flex items-center justify-between">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 -ml-2 text-gray-500 active:text-gray-800">
            <ChevronLeft />
          </button>
          <button onClick={() => setWeekOffset(0)} className="text-sm font-medium text-gray-700">
            📅 {weekLabel}
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 -mr-2 text-gray-500 active:text-gray-800">
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-gray-400 text-sm">Loading suggestions...</div>
          </div>
        ) : (
          <>
            {/* Context panel */}
            <div className="mt-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Context</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">📍</span>
                <span className="text-sm text-gray-700">{context.location?.area || 'Shoreditch'}</span>
                <span className="text-xs text-gray-400">(auto)</span>
              </div>
              <div className="flex gap-1.5">
                {COMPANION_OPTIONS.map(opt => (
                  <button
                    key={opt.mode}
                    onClick={() => updateContext('companions', { mode: opt.mode, detail: null })}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      context.companions?.mode === opt.mode
                        ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                        : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visit reviews (if any) */}
            {pendingReviews.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <h3 className="text-sm font-semibold text-amber-800 mb-2">📋 This Week's Check-in</h3>
                <p className="text-xs text-amber-600 mb-3">Did you go to these?</p>
                {pendingReviews.map(review => (
                  <div key={review.id} className="flex items-center justify-between py-2 border-t border-amber-100 first:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{review.place_name || 'Unknown place'}</p>
                      <p className="text-xs text-gray-500">{review.place_area}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleReviewAction(review.id, review.place_id, 'visited')}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-md active:bg-green-200"
                      >✓ Visited</button>
                      <button
                        onClick={() => handleReviewAction(review.id, review.place_id, 'skipped')}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md active:bg-gray-200"
                      >✗ Nope</button>
                      <button
                        onClick={() => handleReviewAction(review.id, review.place_id, 'go-again')}
                        className="px-2 py-1 text-xs bg-pink-100 text-pink-700 rounded-md active:bg-pink-200"
                      >♡ Again</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Day-by-day suggestions */}
            {dates.map(date => {
              const dateKey = formatDate(date);
              const daySuggestions = suggestions[dateKey] || [];
              const dayEvents = activeEvents.filter(e => {
                const eventDate = new Date(e.date_start).toISOString().split('T')[0];
                return eventDate === dateKey;
              });
              const isToday = dateKey === formatDate(new Date());
              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

              if (daySuggestions.length === 0 && dayEvents.length === 0) {
                return (
                  <div key={dateKey} className="mt-4">
                    <div className={`flex items-baseline gap-2 mb-2 ${isPast ? 'opacity-50' : ''}`}>
                      <h2 className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                        {getDayLabel(date)}
                      </h2>
                      <span className="text-xs text-gray-400">{date.getDate()}</span>
                    </div>
                    <p className="text-xs text-gray-400 italic ml-1">No suggestions yet</p>
                  </div>
                );
              }

              return (
                <div key={dateKey} className={`mt-4 ${isPast ? 'opacity-60' : ''}`}>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h2 className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                      {getDayLabel(date)}
                    </h2>
                    <span className="text-xs text-gray-400">{date.getDate()}</span>
                    {daySuggestions.length > 0 && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                        {daySuggestions.length} suggestion{daySuggestions.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Events for this day */}
                  {dayEvents.map(event => (
                    <EventCard key={event.id} event={event} onAction={handleEventAction} />
                  ))}

                  {/* Place suggestions for this day */}
                  {daySuggestions.map(s => (
                    <SuggestionCard key={s.id} suggestion={s} onAction={handleAction} />
                  ))}
                </div>
              );
            })}

            {/* Events section (not tied to specific day) */}
            {activeEvents.length > 0 && (
              <div className="mt-6 mb-4">
                <h2 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <span>🎭</span> Events This Week
                </h2>
                {activeEvents.slice(0, 8).map(event => (
                  <EventCard key={event.id} event={event} onAction={handleEventAction} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {Object.values(suggestions).every(s => s.length === 0) && activeEvents.length === 0 && pendingReviews.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">✨</p>
                <p className="text-sm font-medium text-gray-600 mb-1">No suggestions yet</p>
                <p className="text-xs text-gray-400">The activity engine runs daily at 2 AM.<br/>Tap "Suggest Now" to refresh manually.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Card Components ───────────────────────────────────────

function SuggestionCard({ suggestion: s, onAction }: {
  suggestion: Suggestion;
  onAction: (id: number, placeId: string, action: 'accepted' | 'dismissed') => void;
}) {
  const emoji = CATEGORY_EMOJI[s.category] || '📍';
  const booking = s.booking_type ? BOOKING_LABELS[s.booking_type] : null;
  const isAccepted = s.status === 'accepted';

  return (
    <div className={`mb-2 p-3 bg-white rounded-xl border shadow-sm ${
      isAccepted ? 'border-green-200 bg-green-50/50' : 'border-gray-100'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm">{emoji}</span>
            <h3 className="text-sm font-semibold text-gray-900 truncate">{s.name}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {s.area && <span>{s.area}</span>}
            {s.suggested_for && <span>· {s.suggested_for}</span>}
            {s.price_tier && <span>· {s.price_tier}</span>}
          </div>
          {s.notes && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.notes}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {booking && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${booking.color}`}>
                {booking.label}
              </span>
            )}
            {s.liked && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-medium">♡ Liked</span>
            )}
            {s.score > 0 && (
              <span className="text-[10px] text-gray-400">Score: {Math.round(s.score)}</span>
            )}
          </div>
        </div>
        {s.google_rating && (
          <div className="text-right shrink-0">
            <div className="text-xs font-bold text-gray-700">{s.google_rating}</div>
            <div className="text-[10px] text-amber-500">★</div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isAccepted && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
          <button
            onClick={() => onAction(s.id, s.place_id, 'accepted')}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium active:bg-blue-100"
          >
            📅 Add to Calendar
          </button>
          <button
            onClick={() => onAction(s.id, s.place_id, 'dismissed')}
            className="px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-medium active:bg-gray-100"
          >
            ✕
          </button>
        </div>
      )}
      {isAccepted && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-green-100">
          <span className="text-xs text-green-600 font-medium">✓ Added to calendar</span>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onAction }: {
  event: CachedEvent;
  onAction: (id: string, action: 'accepted' | 'dismissed') => void;
}) {
  const emoji = event.category ? (CATEGORY_EMOJI[event.category] || '📅') : '📅';
  const isClosingSoon = event.closing_date && new Date(event.closing_date) <= new Date(Date.now() + 7 * 86400000);

  return (
    <div className="mb-2 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm">{emoji}</span>
            <h3 className="text-sm font-semibold text-gray-900 truncate">{event.title}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {event.venue && <span>{event.venue}</span>}
            {event.price && <span>· {event.price}</span>}
          </div>
          {event.reason && (
            <p className="text-xs text-gray-500 mt-1">{event.reason}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1.5">
            {isClosingSoon && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                ⚠️ Closing soon
              </span>
            )}
            {event.tags?.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{tag}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
        <button
          onClick={() => onAction(event.id, 'accepted')}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium active:bg-blue-100"
        >
          📅 Add to Calendar
        </button>
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium active:bg-gray-100"
          >
            🔗
          </a>
        )}
        <button
          onClick={() => onAction(event.id, 'dismissed')}
          className="px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-medium active:bg-gray-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
