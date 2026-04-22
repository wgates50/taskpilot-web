'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PlanningScreen } from './PlanningScreen';
import { Icon } from './ui/Icon';

// ── Types ────────────────────────────────────────────────

// Normalized shape the grid + detail sheet consume. Sourced from real
// Google Calendar primary calendar; built from the /api/calendar/events
// response by `normalizeGcal`.
interface GCalEvent {
  id: string;
  title: string;
  location: string | null;
  description: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  htmlLink: string | null;
  organizerSelf: boolean;
  transparent: boolean;
  eventType: string;
  recurring: boolean;
}

// Raw shape returned by /api/calendar/events (Google Calendar API passthrough).
interface GCalItemRaw {
  id: string;
  summary?: string;
  location?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  htmlLink?: string;
  status?: string;
  organizer?: { self?: boolean; email?: string };
  creator?: { self?: boolean; email?: string };
  transparency?: string;
  eventType?: string;
  recurringEventId?: string;
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

function normalizeGcal(raw: GCalItemRaw): GCalEvent {
  const allDay = Boolean(raw.start?.date && !raw.start?.dateTime);
  // All-day events use YYYY-MM-DD; parse as local midnight.
  const parseStart = () => {
    if (raw.start?.dateTime) return new Date(raw.start.dateTime);
    if (raw.start?.date) {
      const [y, m, d] = raw.start.date.split('-').map(Number);
      return new Date(y, (m ?? 1) - 1, d ?? 1);
    }
    return new Date();
  };
  const parseEnd = () => {
    if (raw.end?.dateTime) return new Date(raw.end.dateTime);
    if (raw.end?.date) {
      const [y, m, d] = raw.end.date.split('-').map(Number);
      // All-day end is exclusive in gcal (e.g. end=2026-04-23 means through Apr 22).
      const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
      dt.setMinutes(dt.getMinutes() - 1);
      return dt;
    }
    return parseStart();
  };
  return {
    id: raw.id,
    title: raw.summary ?? '(no title)',
    location: raw.location ?? null,
    description: raw.description ?? null,
    start: parseStart(),
    end: parseEnd(),
    allDay,
    htmlLink: raw.htmlLink ?? null,
    organizerSelf: Boolean(raw.organizer?.self ?? raw.creator?.self ?? true),
    transparent: raw.transparency === 'transparent',
    eventType: raw.eventType ?? 'default',
    recurring: Boolean(raw.recurringEventId),
  };
}

function formatTimeShort(e: GCalEvent): string {
  if (e.allDay) return 'All day';
  const h = e.start.getHours();
  const m = e.start.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function durationMin(e: GCalEvent): number {
  const ms = e.end.getTime() - e.start.getTime();
  return Math.max(15, Math.round(ms / 60000));
}

// Format a Date as `YYYY-MM-DDTHH:mm` for a <input type="datetime-local">.
function toLocalInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

// Parse a local datetime-input value into an ISO string for gcal.
function fromLocalInput(v: string): string {
  return new Date(v).toISOString();
}

// ── Week grid ────────────────────────────────────────────

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const SLOT_PX = 44;

function WeekGridView({
  dates,
  events,
  onOpenEvent,
  onEmptySlotClick,
}: {
  dates: Date[];
  events: GCalEvent[];
  onOpenEvent?: (e: GCalEvent) => void;
  onEmptySlotClick?: (d: Date, hour: number) => void;
}) {
  const todayStr = formatDate(new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, GCalEvent[]>();
    for (const d of dates) map.set(formatDate(d), []);
    for (const e of events) {
      const key = formatDate(e.start);
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
      <div className="week-grid-scroll">
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

        {(() => {
          const anyAllDay = events.some(e => e.allDay);
          if (!anyAllDay) return null;
          return (
            <div className="week-grid-allday">
              <div className="week-grid-allday-label">All day</div>
              {dates.map((d, i) => {
                const list = (byDay.get(formatDate(d)) ?? []).filter(e => e.allDay);
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

        <div className="week-grid-body">
          {HOURS.map(h => (
            <HourRow
              key={h}
              hour={h}
              dates={dates}
              byDay={byDay}
              onOpenEvent={onOpenEvent}
              onEmptySlotClick={onEmptySlotClick}
            />
          ))}
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
    </div>
  );
}

function HourRow({
  hour,
  dates,
  byDay,
  onOpenEvent,
  onEmptySlotClick,
}: {
  hour: number;
  dates: Date[];
  byDay: Map<string, GCalEvent[]>;
  onOpenEvent?: (e: GCalEvent) => void;
  onEmptySlotClick?: (d: Date, hour: number) => void;
}) {
  return (
    <>
      <div className="week-grid-hour-label">{String(hour).padStart(2, '0')}:00</div>
      {dates.map((d, i) => {
        const list = (byDay.get(formatDate(d)) ?? [])
          .filter(e => !e.allDay && e.start.getHours() === hour);
        return (
          <div
            key={i}
            className="week-grid-cell"
            onClick={() => onEmptySlotClick?.(d, hour)}
            role="button"
            tabIndex={-1}
          >
            {list.map(e => {
              const em = e.start.getMinutes();
              const dur = durationMin(e);
              const top = 2 + (em / 60) * SLOT_PX;
              const height = Math.min((dur / 60) * SLOT_PX, 280) - 3;
              const declined = e.transparent;
              return (
                <div
                  key={e.id}
                  className={`week-grid-event ${declined ? 'transparent' : ''}`}
                  style={{ top, height }}
                  title={`${e.title}${e.location ? ` — ${e.location}` : ''}`}
                  onClick={ev => {
                    ev.stopPropagation();
                    onOpenEvent?.(e);
                  }}
                >
                  <div className="wt">{e.title}</div>
                  {e.recurring && <div className="tag">Recurring</div>}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

// ── Main component ───────────────────────────────────────

type ConnState = 'loading' | 'connected' | 'disconnected' | 'error';

export function CalendarScreen() {
  const [mode, setMode] = useState<CalendarMode>('personal');
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<GCalEvent[]>([]);
  const [connState, setConnState] = useState<ConnState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<GCalEvent | null>(null);
  const [editTarget, setEditTarget] = useState<GCalEvent | null>(null);
  const [createSeed, setCreateSeed] = useState<{ start: Date; end: Date } | null>(null);

  const { dates, label: weekLabel } = getWeekDates(weekOffset);

  const fetchEvents = useCallback(async () => {
    if (mode !== 'personal') return;
    setConnState('loading');
    setErrorMsg(null);
    const { dates: wk } = getWeekDates(weekOffset);
    const from = new Date(wk[0]);
    from.setHours(0, 0, 0, 0);
    const to = new Date(wk[6]);
    to.setHours(23, 59, 59, 999);
    try {
      const res = await fetch(
        `/api/calendar/events?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      );
      if (res.status === 412) {
        setConnState('disconnected');
        setEvents([]);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setConnState('error');
        setErrorMsg(body?.detail ?? `${res.status}`);
        setEvents([]);
        return;
      }
      const data = (await res.json()) as { events: GCalItemRaw[] };
      const normalized = (data.events ?? []).map(normalizeGcal);
      normalized.sort((a, b) => a.start.getTime() - b.start.getTime());
      setEvents(normalized);
      setConnState('connected');
    } catch (err) {
      console.error('Failed to fetch gcal events:', err);
      setConnState('error');
      setErrorMsg(err instanceof Error ? err.message : 'unknown');
      setEvents([]);
    }
  }, [weekOffset, mode]);

  useEffect(() => {
    // Defer one tick so setConnState doesn't run synchronously inside
    // the effect (react-hooks/set-state-in-effect).
    const t = setTimeout(() => { void fetchEvents(); }, 0);
    return () => clearTimeout(t);
  }, [fetchEvents]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this event from Google Calendar? This cannot be undone.')) return;
    const res = await fetch(`/api/calendar/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      alert('Delete failed. Please try again.');
      return;
    }
    setSelectedEvent(null);
    setEditTarget(null);
    fetchEvents();
  }, [fetchEvents]);

  const handleEmptySlotClick = useCallback((d: Date, hour: number) => {
    const start = new Date(d);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    setCreateSeed({ start, end });
  }, []);

  return (
    <div className="tp-body" style={{ minHeight: '100%' }}>
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
          {mode === 'personal' && (
            <>
              <button
                className="tp-btn sm"
                onClick={() => {
                  const now = new Date();
                  const start = new Date(now);
                  start.setMinutes(0, 0, 0);
                  start.setHours(start.getHours() + 1);
                  const end = new Date(start);
                  end.setHours(end.getHours() + 1);
                  setCreateSeed({ start, end });
                }}
              >
                <Icon name="plus" size={12} /> New event
              </button>
              <button
                className="tp-btn sm"
                onClick={fetchEvents}
                disabled={connState === 'loading'}
              >
                <Icon name="refresh" size={12} /> Refresh
              </button>
            </>
          )}
        </div>
      </div>

      {mode === 'planner' ? (
        <PlanningScreen embedded />
      ) : connState === 'loading' ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.08em' }}>
            LOADING
          </div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Fetching your calendar…</div>
        </div>
      ) : connState === 'disconnected' ? (
        <NotConnectedCard />
      ) : connState === 'error' ? (
        <ErrorCard message={errorMsg ?? 'Unknown error'} onRetry={fetchEvents} />
      ) : (
        <WeekGridView
          dates={dates}
          events={events}
          onOpenEvent={e => setSelectedEvent(e)}
          onEmptySlotClick={handleEmptySlotClick}
        />
      )}

      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => {
            setEditTarget(selectedEvent);
            setSelectedEvent(null);
          }}
          onDelete={() => handleDelete(selectedEvent.id)}
        />
      )}

      {editTarget && (
        <EventEditSheet
          mode="edit"
          event={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            fetchEvents();
          }}
        />
      )}

      {createSeed && (
        <EventEditSheet
          mode="create"
          seed={createSeed}
          onClose={() => setCreateSeed(null)}
          onSaved={() => {
            setCreateSeed(null);
            fetchEvents();
          }}
        />
      )}
    </div>
  );
}

// ── Detail / Edit sheets ─────────────────────────────────

function EventDetailSheet({
  event,
  onClose,
  onEdit,
  onDelete,
}: {
  event: GCalEvent;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dateLabel = event.start.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const endLabel = event.allDay
    ? ''
    : ` – ${String(event.end.getHours()).padStart(2, '0')}:${String(event.end.getMinutes()).padStart(2, '0')}`;
  const canEdit = event.organizerSelf && !event.recurring;
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
              {dateLabel} · {formatTimeShort(event)}{endLabel}
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
            {event.location && (
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
                <Icon name="mapPin" size={12} /> {event.location}
              </div>
            )}
          </div>
          <button className="tp-icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={14} />
          </button>
        </div>

        {event.description && (
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              borderLeft: '2px solid var(--accent-weak)',
              fontSize: 12,
              color: 'var(--text-2)',
              lineHeight: 1.45,
              whiteSpace: 'pre-wrap',
              maxHeight: 160,
              overflow: 'auto',
            }}
          >
            {event.description}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {canEdit && (
            <button className="tp-btn sm" onClick={onEdit}>
              Edit
            </button>
          )}
          {canEdit && (
            <button className="tp-btn sm danger" onClick={onDelete}>
              Delete
            </button>
          )}
          {event.htmlLink && (
            <a
              className="tp-btn sm"
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="external" size={12} /> Open in Google
            </a>
          )}
        </div>

        {event.recurring && (
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color: 'var(--text-3)',
              fontStyle: 'italic',
            }}
          >
            Recurring events can&apos;t be edited here yet — open in Google to change the series.
          </div>
        )}
      </div>
    </div>
  );
}

function EventEditSheet(props:
  | { mode: 'create'; seed: { start: Date; end: Date }; onClose: () => void; onSaved: () => void }
  | { mode: 'edit'; event: GCalEvent; onClose: () => void; onSaved: () => void }
) {
  const initialTitle = props.mode === 'edit' ? props.event.title : '';
  const initialLocation = props.mode === 'edit' ? props.event.location ?? '' : '';
  const initialDescription = props.mode === 'edit' ? props.event.description ?? '' : '';
  const initialStart = props.mode === 'edit' ? props.event.start : props.seed.start;
  const initialEnd = props.mode === 'edit' ? props.event.end : props.seed.end;

  const [title, setTitle] = useState(initialTitle);
  const [location, setLocation] = useState(initialLocation);
  const [description, setDescription] = useState(initialDescription);
  const [startStr, setStartStr] = useState(toLocalInput(initialStart));
  const [endStr, setEndStr] = useState(toLocalInput(initialEnd));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSave = async () => {
    if (!title.trim()) {
      setErr('Title is required');
      return;
    }
    const startISO = fromLocalInput(startStr);
    const endISO = fromLocalInput(endStr);
    if (new Date(endISO) <= new Date(startISO)) {
      setErr('End must be after start');
      return;
    }
    setSaving(true);
    setErr(null);
    const body = {
      summary: title.trim(),
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      start: { dateTime: startISO },
      end: { dateTime: endISO },
    };
    try {
      const url = props.mode === 'edit'
        ? `/api/calendar/events/${encodeURIComponent(props.event.id)}`
        : `/api/calendar/create`;
      const res = await fetch(url, {
        method: props.mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        setErr(detail?.detail ?? `Save failed (${res.status})`);
        setSaving(false);
        return;
      }
      props.onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'unknown');
      setSaving(false);
    }
  };

  return (
    <div
      className="tp-palette-backdrop"
      onClick={props.onClose}
      style={{ alignItems: 'flex-end' }}
    >
      <div
        className="tp-palette"
        onClick={e => e.stopPropagation()}
        style={{ padding: 20, maxWidth: 560 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', flex: 1 }}>
            {props.mode === 'edit' ? 'Edit event' : 'New event'}
          </h3>
          <button className="tp-icon-btn" onClick={props.onClose} aria-label="Close">
            <Icon name="x" size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label className="tp-field">
            <span>Title</span>
            <input
              className="tp-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event title"
              autoFocus
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label className="tp-field">
              <span>Starts</span>
              <input
                className="tp-input"
                type="datetime-local"
                value={startStr}
                onChange={e => setStartStr(e.target.value)}
              />
            </label>
            <label className="tp-field">
              <span>Ends</span>
              <input
                className="tp-input"
                type="datetime-local"
                value={endStr}
                onChange={e => setEndStr(e.target.value)}
              />
            </label>
          </div>
          <label className="tp-field">
            <span>Location</span>
            <input
              className="tp-input"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="tp-field">
            <span>Notes</span>
            <textarea
              className="tp-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional"
              rows={3}
            />
          </label>
        </div>

        {err && (
          <div
            style={{
              marginTop: 10,
              padding: '6px 10px',
              fontSize: 12,
              color: 'var(--danger, #b40c2e)',
              background: 'color-mix(in srgb, var(--danger, #b40c2e) 10%, transparent)',
              borderRadius: 4,
            }}
          >
            {err}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button className="tp-btn sm" onClick={props.onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="tp-btn sm primary"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : props.mode === 'edit' ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ancillary cards ──────────────────────────────────────

function NotConnectedCard() {
  return (
    <div
      className="tp-card"
      style={{ padding: 24, textAlign: 'center' }}
    >
      <div
        className="mono"
        style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.06em' }}
      >
        NOT CONNECTED
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>
        Connect Google Calendar
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, maxWidth: 420, marginInline: 'auto' }}>
        My calendar shows your real events from Google Calendar.
        Connect it in Settings → Connections to see and edit your week here.
      </p>
      <a className="tp-btn" href="/api/auth/google/consent" style={{ marginTop: 14 }}>
        <Icon name="external" size={13} /> Connect Google Calendar
      </a>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="tp-card" style={{ padding: 20 }}>
      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.06em' }}>
        ERROR
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>
        Couldn&apos;t load your calendar
      </h3>
      <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 6 }}>
        {message}
      </p>
      <button className="tp-btn sm" style={{ marginTop: 10 }} onClick={onRetry}>
        <Icon name="refresh" size={12} /> Try again
      </button>
    </div>
  );
}
