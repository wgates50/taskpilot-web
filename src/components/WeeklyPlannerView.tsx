'use client';

import { useMemo } from 'react';

interface MessageRow {
  id: string;
  task_id: string;
  blocks: Array<{ type: string; data: Record<string, unknown> }>;
  timestamp: string;
  is_from_user: boolean;
}

interface PlannerEvent {
  title: string;
  time?: string;
  venue?: string;
  date: string;
  tags?: string[];
  energy?: string;
  suggestion?: string;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/* ── helpers ────────────────────────────────────────────────────── */

function parseDayIndex(raw: string): number | null {
  const lower = raw.toLowerCase().trim();
  const map: Record<string, number> = {
    mon: 1, monday: 1, tue: 2, tuesday: 2, wed: 3, wednesday: 3,
    thu: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
    sun: 0, sunday: 0,
  };
  if (map[lower] !== undefined) return map[lower];
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.getDay();
  return null;
}

function toMonFirst(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function extractEvents(messages: MessageRow[]): Map<number, PlannerEvent[]> {
  const buckets = new Map<number, PlannerEvent[]>();
  for (let i = 0; i < 7; i++) buckets.set(i, []);

  for (const msg of messages) {
    for (const block of msg.blocks) {
      const d = block.data;

      if (block.type === 'event_card' && d.date) {
        const idx = parseDayIndex(String(d.date));
        if (idx !== null) {
          buckets.get(toMonFirst(idx))!.push({
            title: String(d.title || ''),
            time: d.time ? String(d.time) : undefined,
            venue: d.venue ? String(d.venue) : undefined,
            date: String(d.date),
            tags: (d.tags as string[]) || [],
          });
        }
      }

      if (block.type === 'calendar_preview' && Array.isArray(d.days)) {
        for (const day of d.days as Array<Record<string, unknown>>) {
          const label = String(day.label || day.day || '');
          const idx = parseDayIndex(label);
          if (idx === null) continue;
          const monIdx = toMonFirst(idx);

          if (typeof day.events === 'number') {
            buckets.get(monIdx)!.push({
              title: `${day.events} event${day.events === 1 ? '' : 's'}`,
              date: label,
              energy: day.energy ? String(day.energy) : undefined,
              suggestion: day.suggestion ? String(day.suggestion) : undefined,
            });
          } else if (Array.isArray(day.events)) {
            for (const ev of day.events as Array<Record<string, unknown>>) {
              buckets.get(monIdx)!.push({
                title: String(ev.title || ''),
                time: ev.time ? String(ev.time) : undefined,
                date: label,
              });
            }
          }

          if (day.freeEvening) {
            buckets.get(monIdx)!.push({ title: 'Free evening', date: label });
          }
          if (day.suggestion) {
            buckets.get(monIdx)!.push({
              title: String(day.suggestion),
              date: label,
              suggestion: String(day.suggestion),
            });
          }
        }
      }
    }
  }
  return buckets;
}

/* ── energy badge colours ──────────────────────────────────────── */

const ENERGY_STYLE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  packed: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  balanced: 'bg-green-100 text-green-700',
  low: 'bg-green-100 text-green-700',
};

/* ── component ─────────────────────────────────────────────────── */

interface Props {
  messages: MessageRow[];
  loading: boolean;
}

export function WeeklyPlannerView({ messages, loading }: Props) {
  const todayMonIdx = toMonFirst(new Date().getDay());
  const buckets = useMemo(() => extractEvents(messages), [messages]);

  /* Week dates for the header (e.g. "7 Apr") */
  const weekDates = useMemo(() => {
    const now = new Date();
    const jsDay = now.getDay();
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
    return DAY_LABELS.map((_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + mondayOffset + i);
      return d.getDate();
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
        Loading planner…
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* ── Desktop: 7-column grid  ·  Mobile: horizontal scroll ── */}
      <div className="flex-1 overflow-x-auto overflow-y-auto px-3 py-4">
        <div
          className="grid gap-2 h-full"
          style={{
            gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))',
          }}
        >
          {DAY_LABELS.map((label, i) => {
            const isToday = i === todayMonIdx;
            const events = buckets.get(i) || [];

            return (
              <div
                key={label}
                className={`rounded-2xl border flex flex-col min-h-[180px] transition-colors ${
                  isToday
                    ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Day header */}
                <div className={`px-3 py-2.5 border-b ${
                  isToday ? 'border-blue-200' : 'border-gray-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[22px] font-bold leading-none ${
                      isToday ? 'text-blue-600' : 'text-gray-800'
                    }`}>
                      {weekDates[i]}
                    </span>
                    <span className={`text-[13px] font-medium ${
                      isToday ? 'text-blue-500' : 'text-gray-400'
                    }`}>
                      {label}
                    </span>
                    {isToday && (
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        Today
                      </span>
                    )}
                  </div>
                </div>

                {/* Events list */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                  {events.length === 0 ? (
                    <p className="text-[12px] text-gray-300 text-center mt-4">—</p>
                  ) : (
                    events.map((ev, j) => (
                      <div
                        key={j}
                        className={`rounded-xl px-3 py-2 text-[13px] ${
                          ev.suggestion
                            ? 'bg-violet-50 border border-violet-200'
                            : isToday
                            ? 'bg-white border border-blue-100 shadow-sm'
                            : 'bg-gray-50 border border-gray-100'
                        }`}
                      >
                        {ev.time && (
                          <p className="text-[11px] font-semibold text-blue-600 mb-0.5">
                            {ev.time}
                          </p>
                        )}
                        <p className="font-semibold text-gray-900 leading-snug">
                          {ev.title}
                        </p>
                        {ev.venue && (
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                            {ev.venue}
                          </p>
                        )}
                        {ev.tags && ev.tags.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {ev.tags.map(tag => (
                              <span
                                key={tag}
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {ev.energy && (
                          <span className={`inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            ENERGY_STYLE[ev.energy.toLowerCase()] || 'bg-gray-100 text-gray-600'
                          }`}>
                            {ev.energy}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
