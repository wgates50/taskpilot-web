'use client';

import { useState, useMemo } from 'react';

/* ── types ─────────────────────────────────────────────────────── */

interface CalendarEvent {
  title: string;
  time?: string;
}

interface Suggestion {
  title: string;
  venue?: string;
  reason?: string;
  url?: string;
  map_url?: string;
  category?: string;
  tags?: string[];
}

interface DayData {
  label?: string;
  day?: string;
  date?: string;
  events: CalendarEvent[] | number;
  energy?: string;
  freeEvening?: boolean;
  suggestion?: string;
  suggestions?: Suggestion[];
}

interface ClosingSoonItem {
  title: string;
  deadline?: string;
  url?: string;
}

interface CalendarPreviewData {
  energy?: string;
  days?: DayData[];
  closing_soon?: ClosingSoonItem[];
  week_label?: string;
  summary?: {
    total_events?: number;
    free_evenings?: number;
    free_weekend_slots?: number;
  };
}

interface MessageRow {
  id: string;
  task_id: string;
  blocks: Array<{ type: string; data: Record<string, unknown> }>;
  timestamp: string;
  is_from_user: boolean;
}

type SlotAction = 'accepted' | 'swap' | 'dismissed';

const ENERGY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  packed: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  balanced: 'bg-green-100 text-green-700',
  low: 'bg-green-100 text-green-700',
  'wide open': 'bg-blue-100 text-blue-700',
};

/* ── main component ────────────────────────────────────────────── */

interface Props {
  messages: MessageRow[];
  loading: boolean;
}

export function WeeklyPlannerView({ messages, loading }: Props) {
  const [slotStates, setSlotStates] = useState<Record<string, SlotAction>>({});

  // Find the most recent calendar_preview block across all messages
  const calendarData = useMemo<CalendarPreviewData>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (!msg.is_from_user) {
        const block = msg.blocks.find(b => b.type === 'calendar_preview');
        if (block?.data) return block.data as CalendarPreviewData;
      }
    }
    return {} as CalendarPreviewData;
  }, [messages]);

  const days = calendarData.days || [];
  const closingSoon = calendarData.closing_soon || [];
  const topEnergy = calendarData.energy || '';

  // Summary stats
  const totalEvents = calendarData.summary?.total_events ?? days.reduce((sum, day) => {
    if (typeof day.events === 'number') return sum + day.events;
    return sum + ((day.events as CalendarEvent[])?.length || 0);
  }, 0);

  const freeEvenings = calendarData.summary?.free_evenings ?? days.filter(d => d.freeEvening).length;

  const freeWeekendSlots = calendarData.summary?.free_weekend_slots ?? days.filter(d => {
    const label = (d.label || d.day || '').toLowerCase();
    if (!label.startsWith('sat') && !label.startsWith('sun')) return false;
    const count = typeof d.events === 'number' ? d.events : (d.events as CalendarEvent[])?.length || 0;
    return count === 0;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
        Loading planner…
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 px-8 text-center">
        <p className="text-gray-500 text-sm">No plan yet.</p>
        <p className="text-gray-400 text-[12px]">This task will post here on its next run.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Summary bar */}
      <div className="flex items-center gap-5 px-4 py-3 bg-white border-b shrink-0">
        <SummaryPill value={totalEvents} label="this week" />
        <div className="w-px h-8 bg-gray-100" />
        <SummaryPill value={freeEvenings} label="free evenings" />
        <div className="w-px h-8 bg-gray-100" />
        <SummaryPill value={freeWeekendSlots} label="free wknd slots" />
        {topEnergy && (
          <>
            <div className="w-px h-8 bg-gray-100" />
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ENERGY_BADGE[topEnergy.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
              {topEnergy}
            </span>
          </>
        )}
      </div>

      {/* Day cards — vertical scroll */}
      <div className="px-4 py-4 space-y-2.5">
        {days.map((day, i) => {
          const label = day.label || day.day || `Day ${i + 1}`;
          const isWeekend = label.toLowerCase().startsWith('sat') || label.toLowerCase().startsWith('sun');
          const events = typeof day.events === 'number' ? [] : (day.events as CalendarEvent[]) || [];
          const eventCount = typeof day.events === 'number' ? day.events : events.length;
          const slotKey = `day-${i}`;
          const slotState = slotStates[slotKey];

          return (
            <div
              key={i}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                isWeekend ? 'border-violet-100' : 'border-gray-100'
              }`}
            >
              {/* Day header row */}
              <div className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-100 ${
                isWeekend ? 'bg-violet-50/60' : 'bg-gray-50/80'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] font-semibold ${
                    isWeekend ? 'text-violet-700' : 'text-gray-800'
                  }`}>
                    {label}
                  </span>
                  {day.date && (
                    <span className="text-[11px] text-gray-400">{day.date}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {eventCount > 0 && (
                    <span className="text-[11px] text-gray-400">
                      {eventCount} event{eventCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {day.energy && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      ENERGY_BADGE[day.energy.toLowerCase()] || 'bg-gray-100 text-gray-600'
                    }`}>
                      {day.energy}
                    </span>
                  )}
                </div>
              </div>

              {/* Day body */}
              <div className="px-4 py-3 space-y-1.5">
                {/* Existing events */}
                {events.map((ev, j) => (
                  <div key={j} className="flex items-center gap-2.5">
                    <div className="w-0.5 h-4 rounded-full bg-blue-300 shrink-0" />
                    <span className="text-[12px] text-gray-600 leading-tight">
                      {ev.time && <span className="text-gray-400 tabular-nums mr-1">{ev.time}</span>}
                      {ev.title}
                    </span>
                  </div>
                ))}

                {/* Free evening indicator */}
                {day.freeEvening && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-0.5 h-4 rounded-full bg-green-300 shrink-0" />
                    <span className="text-[12px] text-green-600">Free evening</span>
                  </div>
                )}

                {/* Activity suggestions (multiple) */}
                {day.suggestions && day.suggestions.length > 0 && (
                  <div className="space-y-1.5 mt-1">
                    {day.suggestions.map((sug, k) => {
                      const sugKey = `day-${i}-sug-${k}`;
                      const sugState = slotStates[sugKey];
                      if (sugState === 'dismissed') return null;
                      return (
                        <SuggestionSlot
                          key={k}
                          suggestion={sug}
                          state={sugState}
                          onAction={(action) => setSlotStates(prev => ({ ...prev, [sugKey]: action }))}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Legacy single suggestion */}
                {!day.suggestions?.length && day.suggestion && slotState !== 'dismissed' && (
                  <SuggestionSlot
                    suggestion={{ title: day.suggestion }}
                    state={slotState}
                    onAction={(action) => setSlotStates(prev => ({ ...prev, [slotKey]: action }))}
                  />
                )}

                {/* Empty day */}
                {events.length === 0 && !day.freeEvening && !day.suggestion && !day.suggestions?.length && (
                  <p className="text-[12px] text-gray-300 italic py-0.5">Nothing scheduled</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Closing Soon section */}
        {closingSoon.length > 0 && (
          <div className="pt-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
              Closing Soon
            </p>
            <div className="space-y-2">
              {closingSoon.map((item, i) => (
                <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-800 truncate">{item.title}</p>
                    {item.deadline && (
                      <p className="text-[11px] text-amber-600 mt-0.5">Deadline: {item.deadline}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom padding */}
        <div className="h-4" />
      </div>
    </div>
  );
}

/* ── sub-components ────────────────────────────────────────────── */

function SummaryPill({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-[20px] font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5 leading-none">{label}</p>
    </div>
  );
}

function SuggestionSlot({
  suggestion,
  state,
  onAction,
}: {
  suggestion: Suggestion;
  state: SlotAction | undefined;
  onAction: (action: SlotAction) => void;
}) {
  const mapLink = suggestion.map_url || (suggestion.venue
    ? `https://www.google.com/maps/search/${encodeURIComponent(suggestion.venue)}`
    : null);

  if (state === 'accepted') {
    return (
      <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-green-50 border border-green-200">
        <span className="text-green-500 text-[13px]">✓</span>
        <p className="text-[12px] text-green-700 flex-1">{suggestion.title}</p>
        <span className="text-[11px] text-green-500 font-medium shrink-0">Added</span>
      </div>
    );
  }

  if (state === 'swap') {
    return (
      <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-amber-50 border border-amber-200">
        <span className="text-amber-500 text-[13px]">↻</span>
        <p className="text-[12px] text-amber-700 flex-1 italic">{suggestion.title}</p>
        <span className="text-[11px] text-amber-500 font-medium shrink-0">Swapping…</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg px-3 py-2 bg-violet-50 border border-violet-100">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-violet-800 leading-snug">{suggestion.title}</p>
          {suggestion.venue && (
            <div className="flex items-center gap-1 mt-0.5">
              {mapLink ? (
                <a href={mapLink} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-violet-500 hover:text-violet-700 flex items-center gap-0.5">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {suggestion.venue}
                </a>
              ) : (
                <span className="text-[11px] text-violet-500">{suggestion.venue}</span>
              )}
            </div>
          )}
          {suggestion.reason && (
            <p className="text-[11px] text-violet-500 mt-0.5 italic">{suggestion.reason}</p>
          )}
        </div>
      </div>
      <div className="flex gap-1.5 mt-2">
        <button
          onClick={() => onAction('accepted')}
          className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
        >
          Accept
        </button>
        {suggestion.url && (
          <a href={suggestion.url} target="_blank" rel="noopener noreferrer"
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
            Info
          </a>
        )}
        <button
          onClick={() => onAction('dismissed')}
          className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
