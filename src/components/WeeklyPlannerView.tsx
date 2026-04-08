'use client';

import { useState, useEffect, useMemo } from 'react';

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

/**
 * Parse a date string and return the JS day index (0=Sun … 6=Sat).
 * Handles "Monday", "Mon", "2026-04-08", etc.
 */
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

/** Convert JS day (0=Sun) to our Mon-first index (0=Mon … 6=Sun). */
function toMonFirst(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Walk every message block and extract events keyed by Mon-first day index.
 * Supports: event_card, calendar_preview (with days[]), and any block with
 * a recognisable date/day + title.
 */
function extractEvents(messages: MessageRow[]): Map<number, PlannerEvent[]> {
  const buckets = new Map<number, PlannerEvent[]>();
  for (let i = 0; i < 7; i++) buckets.set(i, []);

  for (const msg of messages) {
    for (const block of msg.blocks) {
      const d = block.data;

      // --- event_card blocks ---
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

      // --- calendar_preview blocks (days array) ---
      if (block.type === 'calendar_preview' && Array.isArray(d.days)) {
        for (const day of d.days as Array<Record<string, unknown>>) {
          const label = String(day.label || day.day || '');
          const idx = parseDayIndex(label);
          if (idx === null) continue;
          const monIdx = toMonFirst(idx);

          if (typeof day.events === 'number') {
            // Compact format — synthesise a summary event
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

interface Props {
  messages: MessageRow[];
  loading: boolean;
}

export function WeeklyPlannerView({ messages, loading }: Props) {
  const todayMonIdx = toMonFirst(new Date().getDay());

  const buckets = useMemo(() => extractEvents(messages), [messages]);

  // Build the current week's date strings (Mon–Sun)
  const weekDates = useMemo(() => {
    const now = new Date();
    const jsDay = now.getDay();
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
    return DAY_LABELS.map((_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + mondayOffset + i);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Loading planner…
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4">
      {/* Grid: single column on mobile, 7 cols on lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
        {DAY_LABELS.map((label, i) => {
          const isToday = i === todayMonIdx;
          const events = buckets.get(i) || [];

          return (
            <div
              key={label}
              className={`rounded-2xl border p-3 min-h-[120px] transition-colors ${
                isToday
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-gray-100'
              }`}
            >
              {/* Day header */}
              <div className="flex items-baseline justify-between mb-2">
                <span
                  className={`text-[13px] font-semibold ${
                    isToday ? 'text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {label}
                </span>
                <span className="text-[11px] text-gray-400">{weekDates[i]}</span>
              </div>

              {/* Event cards */}
              {events.length === 0 ? (
                <p className="text-[11px] text-gray-300 italic">No events</p>
              ) : (
                <div className="space-y-1.5">
                  {events.map((ev, j) => (
                    <div
                      key={j}
                      className={`rounded-lg px-2.5 py-1.5 shadow-sm text-[12px] ${
                        ev.suggestion
                          ? 'bg-violet-50 border border-violet-200'
                          : 'bg-gray-50 border border-gray-100'
                      }`}
                    >
                      {ev.time && (
                        <p className="text-[10px] font-medium text-blue-600">{ev.time}</p>
                      )}
                      <p className="font-medium text-gray-900 leading-tight">{ev.title}</p>
                      {ev.venue && (
                        <p className="text-[10px] text-gray-500 mt-0.5">{ev.venue}</p>
                      )}
                      {ev.tags && ev.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {ev.tags.map(tag => (
                            <span key={tag} className="text-[9px] px-1 py-0.5 rounded-full bg-amber-50 text-amber-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {ev.energy && (
                        <span className={`inline-block mt-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                          ev.energy.toLowerCase() === 'high' || ev.energy.toLowerCase() === 'packed'
                            ? 'bg-red-100 text-red-700'
                            : ev.energy.toLowerCase() === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {ev.energy}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
