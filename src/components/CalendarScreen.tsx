'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PlanningScreen } from './PlanningScreen';
import { Icon } from './ui/Icon';

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

type CalendarMode = 'personal' | 'planner';

// ── Helpers ──────────────────────────────────────────────

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function getWeekDates(offset: number = 0): { dates: Date[]; label: string } {
  const start = addDays(startOfWeek(new Date()), offset * 7);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const sun = dates[6];
  const monthFmt = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' });
  const label = `${start.getDate()} ${monthFmt(start)} — ${sun.getDate()} ${monthFmt(sun)}`;
  return { dates, label };
}

function isAllDay(e: CachedEvent): boolean {
  if (Array.isArray(e.tags) && e.tags.includes('all-day')) return true;
  const d = new Date(e.date_start);
  return d.getHours() === 0 && d.getMinutes() === 0;
}

function isWhatsOn(e: CachedEvent): boolean {
  return Array.isArray(e.tags) &&
    e.tags.some(t => typeof t === 'string' && t.startsWith('cal:'));
}

function eventHour(isoStr: string): number {
  return new Date(isoStr).getHours();
}

function eventMinute(isoStr: string): number {
  return new Date(isoStr).getMinutes();
}

function eventDurationMin(e: CachedEvent): number {
  if (!e.date_end) return 60;
  const ms = new Date(e.date_end).getTime() - new Date(e.date_start).getTime();
  return Math.max(15, Math.round(ms / 60000));
}

function formatTimeShort(isoStr: string, tags?: string[]): string {
  if (tags?.includes('all-day')) return 'All day';
  const d = new Date(isoStr);
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return 'All day';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Week Grid View ───────────────────────────────────────
// Hour-slot grid for the user's personal calendar.

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const SLOT_PX = 44;

function WeekGridView({
  dates,
  events,
  onOpenEvent,
}: {
  dates: Date[];
  events: CachedEvent[];
  onOpenEvent?: (e: CachedEvent) => void;
}) {
  const todayStr = formatDate(new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, CachedEvent[]>();
    for (const d of dates) map.set(formatDate(d), []);
    for (const e of events) {
      const key = e.date_start.slice(0, 10);
      if (map.has(key)) map.get(key)!.push(e);
    }
    return map;
  }, [dates, events]);

  const now = new Date();
  const nowHourIdx = HOURS.indexOf(now.getHours());
  const nowMinFraction = now.getMinutes() / 60;
  const todayIdxInWeek = dates.findIndex(d => formatDate(d) === todayStr);

  return (
    <div className="week-grid-card">
      {/* Day header row */}
      <div className="week-grid-head">
        <div />
        {dates.map((d, i) => {
          const isToday = formatDate(d) === todayStr;
          return (
            <div key={i} className={`week-grid-head-cell ${isToday ? 'today' : ''}`}>
              <div className="wd">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
              <div className="dn">{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* All-day row (if any) */}
      {(() => {
        const anyAllDay = events.some(isAllDay);
        if (!anyAllDay) return null;
        return (
          <div className="week-grid-allday">
            <div className="week-grid-allday-label">All day</div>
            {dates.map((d, i) => {
              const list = (byDay.get(formatDate(d)) ?? []).filter(isAllDay);
              return (
                <div key={i} className="week-grid-allday-cell">
                  {list.map(e => (
                    <div
                      key={e.id}
                      className="week-grid-allday-event"
                      title={e.title}
                      onClick={() => onOpenEvent?.(e)}
                    >
                      {e.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Hour grid */}
      <div className="week-grid-body">
        {HOURS.map(h => (
          <HourRow
            key={h}
            hour={h}
            dates={dates}
            byDay={byDay}
            onOpenEvent={onOpenEvent}
          />
        ))}
        {/* Now line — only on today column, only when hour visible */}
        {nowHourIdx >= 0 && todayIdxInWeek >= 0 && (
          <div
            style={{
              position: 'absolute',
              top: nowHourIdx * SLOT_PX + nowMinFraction * SLOT_PX,
              left: `calc(54px + ${todayIdxInWeek} * ((100% - 54px) / 7))`,
              width: `calc((100% - 54px) / 7)`,
              borderTop: '2px solid var(--accent)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: -5,
                top: -5,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function HourRow({
  hour,
  dates,
  byDay,
  onOpenEvent,
}: {
  hour: number;
  dates: Date[];
  byDay: Map<string, CachedEvent[]>;
  onOpenEvent?: (e: CachedEvent) => void;
}) {
  return (
    <>
      <div className="week-grid-hour-label">{String(hour).padStart(2, '0')}:00</div>
      {dates.map((d, i) => {
        const list = (byDay.get(formatDate(d)) ?? [])
          .filter(e => !isAllDay(e) && eventHour(e.date_start) === hour);
        return (
          <div key={i} className="week-grid-cell">
            {list.map(e => {
              const em = eventMinute(e.date_start);
              const durMin = eventDurationMin(e);
              const top = 2 + (em / 60) * SLOT_PX;
              const height = Math.min((durMin / 60) * SLOT_PX, 140) - 3;
              const suggested = isWhatsOn(e);
              return (
                <div
                  key={e.id}
                  className={`week-grid-event ${suggested ? 'suggested' : ''}`}
                  style={{ top, height }}
                  title={`${e.title}${e.venue ? ` — ${e.venue}` : ''}`}
                  onClick={() => onOpenEvent?.(e)}
                >
                  <div className="wt">{e.title}</div>
                  {suggested && <div className="tag">Planner</div>}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

// ── Main Component ───────────────────────────────────────

export function CalendarScreen() {
  const [mode, setMode] = useState<CalendarMode>('personal');
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<CachedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CachedEvent | null>(null);

  const { dates, label: weekLabel } = getWeekDates(weekOffset);

  const fetchEvents = useCallback(async () => {
    if (mode !== 'personal') { setLoading(false); return; }
    setLoading(true);
    const { dates: wk } = getWeekDates(weekOffset);
    try {
      const from = formatDate(wk[0]);
      const to = formatDate(wk[6]);
      const res = await fetch(`/api/events?from=${from}T00:00:00Z&to=${to}T23:59:59Z`);
      if (res.ok) {
        const data = await res.json();
        const sorted = (data.events || []).sort(
          (a: CachedEvent, b: CachedEvent) =>
            new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
        );
        setEvents(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
    } finally {
      setLoading(false);
    }
  }, [weekOffset, mode]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Personal view shows real calendar events (non-whatsOn) + any whatsOn the user has already accepted
  const personalEvents = useMemo(
    () => events.filter(e => !isWhatsOn(e) || e.status === 'accepted'),
    [events],
  );

  return (
    <div className="tp-body" style={{ minHeight: '100%' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div className="mode-switch" role="tablist" aria-label="Calendar mode">
          {([
            ['personal', 'My calendar'],
            ['planner', 'Planner'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={mode === id}
              className={mode === id ? 'active' : ''}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'personal' && (
          <div className="week-nav">
            <button
              className="tp-icon-btn"
              onClick={() => setWeekOffset(w => w - 1)}
              aria-label="Previous week"
            >
              <Icon name="chevronLeft" size={15} />
            </button>
            <span className="label">{weekLabel}</span>
            <button
              className="tp-icon-btn"
              onClick={() => setWeekOffset(w => w + 1)}
              aria-label="Next week"
            >
              <Icon name="chevronRight" size={15} />
            </button>
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {mode === 'personal' && weekOffset !== 0 && (
            <button className="tp-btn sm" onClick={() => setWeekOffset(0)}>
              Today
            </button>
          )}
          <button className="tp-btn sm">
            <Icon name="filter" size={12} /> Filter
          </button>
        </div>
      </div>

      {/* Content */}
      {mode === 'planner' ? (
        <PlanningScreen embedded />
      ) : loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.08em' }}>
            LOADING
          </div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Fetching your calendar…</div>
        </div>
      ) : (
        <WeekGridView
          dates={dates}
          events={personalEvents}
          onOpenEvent={e => setSelectedEvent(e)}
        />
      )}

      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

// ── Event detail sheet (lightweight modal) ──────────────

function EventDetailSheet({
  event,
  onClose,
}: {
  event: CachedEvent;
  onClose: () => void;
}) {
  const timeLabel = formatTimeShort(event.date_start, event.tags ?? undefined);
  const dateLabel = new Date(event.date_start).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div
      className="tp-palette-backdrop"
      onClick={onClose}
      style={{ alignItems: 'flex-end' }}
    >
      <div
        className="tp-palette"
        onClick={e => e.stopPropagation()}
        style={{ padding: 20, maxWidth: 520 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {dateLabel} · {timeLabel}
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: '-0.015em',
                marginTop: 4,
              }}
            >
              {event.title}
            </h3>
            {event.venue && (
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--text-2)',
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name="mapPin" size={12} /> {event.venue}
              </div>
            )}
          </div>
          <button className="tp-icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={14} />
          </button>
        </div>

        {event.reason && !event.reason.startsWith('Synced from') && (
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              borderLeft: '2px solid var(--accent-weak)',
              fontSize: 12,
              fontStyle: 'italic',
              color: 'var(--text-2)',
              lineHeight: 1.45,
            }}
          >
            {event.reason}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {event.url && (
            <a
              className="tp-btn sm"
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="external" size={12} /> Open
            </a>
          )}
          {event.calendar_link && (
            <a
              className="tp-btn sm"
              href={event.calendar_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="calendar" size={12} /> In Google Calendar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
