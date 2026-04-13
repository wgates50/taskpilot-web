'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlanningScreen } from './PlanningScreen';

// ── Types ────────────────────────────────────────────────

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
  lat: number | null;
  lng: number | null;
}

type CalendarMode = 'personal' | 'whats-on' | 'planner';

// ── Helpers ──────────────────────────────────────────────

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

function getDayLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long' });
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return 'All day';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Main Component ───────────────────────────────────────

export function CalendarScreen() {
  const [mode, setMode] = useState<CalendarMode>('personal');
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<CachedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const { dates, label: weekLabel } = getWeekDates(weekOffset);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const from = formatDate(dates[0]);
      const to = formatDate(dates[6]);
      const res = await fetch(`/api/events?from=${from}T00:00:00Z&to=${to}T23:59:59Z`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Filter events by mode
  const personalEvents = events.filter(e => e.id.startsWith('gcal-'));
  const whatsOnEvents = events.filter(e => !e.id.startsWith('gcal-'));

  const displayEvents = mode === 'personal' ? personalEvents :
                         mode === 'whats-on' ? whatsOnEvents :
                         events;

  // Group events by date
  const eventsByDate: Record<string, CachedEvent[]> = {};
  for (const e of displayEvents) {
    const dateKey = e.date_start.slice(0, 10);
    (eventsByDate[dateKey] ||= []).push(e);
  }

  const handleEventAction = async (eventId: string, action: 'accepted' | 'dismissed') => {
    try {
      await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, status: action }),
      });
      if (action === 'dismissed') {
        setEvents(prev => prev.filter(e => e.id !== eventId));
      } else {
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: 'accepted' } : e));
      }
    } catch (err) {
      console.error('Event action failed:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 pt-12 lg:pt-4 pb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Calendar</h1>

        {/* Mode switcher */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 mb-3">
          {([
            { id: 'personal' as CalendarMode, label: 'My Calendar' },
            { id: 'whats-on' as CalendarMode, label: "What's On" },
            { id: 'planner' as CalendarMode, label: 'Planner' },
          ]).map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mode === m.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Week navigator */}
        <div className="flex items-center justify-between">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 -ml-2 text-gray-500 active:text-gray-800">
            <ChevronLeft />
          </button>
          <button onClick={() => setWeekOffset(0)} className="text-sm font-medium text-gray-700">
            {weekLabel}
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 -mr-2 text-gray-500 active:text-gray-800">
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-gray-400 text-sm">Loading calendar...</div>
          </div>
        ) : mode === 'planner' ? (
          // Planner mode renders inline — no redirect needed
          <div className="mt-2">
            <PlanningScreen embedded />
          </div>
        ) : (
          <div className="mt-2 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-x-4">
            {dates.map(date => {
              const dateKey = formatDate(date);
              const dayEvents = eventsByDate[dateKey] || [];
              const isToday = dateKey === formatDate(new Date());
              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
              const dayNumber = date.getDate();
              const weekdayShort = date.toLocaleDateString('en-GB', { weekday: 'short' });

              return (
                <div key={dateKey} className={`mt-3 lg:mt-0 lg:mb-4 ${isPast ? 'opacity-60' : ''}`}>
                  {/* Day header */}
                  <div className={`flex items-baseline gap-2 mb-1.5 pl-1 border-l-2 ${
                    isToday ? 'border-blue-500' : 'border-gray-300'
                  }`}>
                    <h2 className={`text-base font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {getDayLabel(date)}
                    </h2>
                    <span className="text-xs text-gray-500">{weekdayShort} {dayNumber}</span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-gray-400 ml-auto">
                        {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-gray-400 italic pl-3 mb-2">No events</p>
                  ) : (
                    dayEvents.map(event => (
                      <CalendarEventCard
                        key={event.id}
                        event={event}
                        onAction={handleEventAction}
                        showDidntGo={isPast}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card Component ───────────────────────────────────────

function CalendarEventCard({ event, onAction, showDidntGo }: {
  event: CachedEvent;
  onAction: (id: string, action: 'accepted' | 'dismissed') => void;
  showDidntGo: boolean;
}) {
  const isFromCalendar = event.id.startsWith('gcal-');
  const isAccepted = event.status === 'accepted';
  const timeLabel = formatTime(event.date_start);

  return (
    <div className={`mb-1.5 px-3 py-2.5 bg-white rounded-lg border shadow-sm ${
      isFromCalendar ? 'border-blue-100' :
      isAccepted ? 'border-green-200 bg-green-50/50' : 'border-gray-100'
    }`}>
      <div className="flex items-start gap-2.5">
        {/* Time column */}
        <div className="shrink-0 w-12 text-center pt-0.5">
          <span className={`text-xs font-medium ${isFromCalendar ? 'text-blue-600' : 'text-gray-500'}`}>
            {timeLabel}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{event.title}</h3>
            {isFromCalendar && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium shrink-0">
                gcal
              </span>
            )}
          </div>
          {event.venue && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{event.venue}</p>
          )}
          {event.reason && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{event.reason}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            {event.tags?.filter(t => t !== 'gcal' && t !== 'personal').slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{tag}</span>
            ))}
            {event.price && (
              <span className="text-[10px] text-gray-500">{event.price}</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {showDidntGo && isFromCalendar && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => onAction(event.id, 'accepted')}
            className={`flex-1 py-1 rounded-md text-[11px] font-medium ${
              event.status === 'accepted'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-50 text-gray-600 active:bg-gray-100'
            }`}
          >
            Went
          </button>
          <button
            onClick={() => onAction(event.id, 'dismissed')}
            className="flex-1 py-1 bg-gray-50 text-gray-600 rounded-md text-[11px] font-medium active:bg-gray-100"
          >
            Didn&apos;t go
          </button>
        </div>
      )}
      {!showDidntGo && !isFromCalendar && !isAccepted && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1 bg-blue-50 text-blue-600 rounded-md text-[11px] font-medium text-center active:bg-blue-100"
            >
              More info
            </a>
          )}
          <button
            onClick={() => onAction(event.id, 'accepted')}
            className="flex-1 py-1 bg-blue-50 text-blue-600 rounded-md text-[11px] font-medium active:bg-blue-100"
          >
            Add to calendar
          </button>
          <button
            onClick={() => onAction(event.id, 'dismissed')}
            className="px-2 py-1 bg-gray-50 text-gray-500 rounded-md text-[11px] font-medium active:bg-gray-100"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────

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
