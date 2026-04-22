'use client';

import { useState, useEffect, useCallback } from 'react';
import { Glyph } from './ui/Glyph';
import { Chip } from './ui/Chip';
import { SectionLabel } from './ui/SectionLabel';
import { Icon } from './ui/Icon';

// ── Types ────────────────────────────────────────────────

interface Block {
  type: string;
  data: Record<string, unknown>;
  [key: string]: unknown;
}

interface MessageRow {
  id: string;
  task_id: string;
  blocks: Block[];
  timestamp: string;
  is_from_user: boolean;
}

// ── Helpers ──────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase().replace(/,/g, ' ·');
}

// Pick a deterministic glyph tone from a seed string
const TONES = ['a', 'b', 'c', 'd', 'e', 'f'] as const;
function toneFor(seed: string): (typeof TONES)[number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return TONES[Math.abs(h) % TONES.length];
}

// Extract monogram initial(s) from title/venue
function monoFor(str: string): string {
  const clean = (str || '').trim();
  if (!clean) return '·';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}


// ── Weather block ────────────────────────────────────────

interface WeatherData {
  temp?: number; conditions?: string;
  high?: number; low?: number;
  rain?: number; rainChance?: number;
  sunrise?: string; sunset?: string;
}

function WeatherBlock({ data }: { data: WeatherData }) {
  const temp = data.temp ?? 0;
  const cond = data.conditions || 'Clear';
  const high = data.high, low = data.low;
  const rain = data.rain ?? data.rainChance;
  return (
    <div className="weather">
      <div>
        <div className="weather-temp">{Math.round(temp)}<sup>°C</sup></div>
        <div className="weather-cond">{cond}</div>
      </div>
      <div className="weather-stats">
        {high !== undefined && low !== undefined && (
          <div><b>H</b>{Math.round(high)}°&nbsp;&nbsp;<b>L</b>{Math.round(low)}°</div>
        )}
        {rain !== undefined && <div><b>RAIN</b>{rain}%</div>}
        {data.sunrise && data.sunset && (
          <div><b>SUN</b>{data.sunrise} — {data.sunset}</div>
        )}
      </div>
    </div>
  );
}

// ── Next-up event ────────────────────────────────────────

interface EventData {
  title?: string; venue?: string; time?: string;
  date?: string; dur?: string; duration?: string;
  mono?: string; tone?: string;
  tags?: string[]; price?: string; reason?: string;
  url?: string;
}

function NextUp({ event }: { event: EventData }) {
  const title = event.title || 'Untitled';
  const venue = event.venue || '';
  const time = event.time || '';
  const dur = event.dur || event.duration || '';
  return (
    <div className="nextup" role="button" tabIndex={0}>
      <div className="nextup-rail" />
      <div className="nextup-time">NEXT UP{time && ` · ${time}`}</div>
      <div className="nextup-title">{title}</div>
      <div className="nextup-meta">{[venue, dur].filter(Boolean).join(' · ')}</div>
    </div>
  );
}

// ── Event row (today's list) ─────────────────────────────

function EventRow({ event }: { event: EventData }) {
  const title = event.title || 'Untitled';
  const venue = event.venue || '';
  const time = event.time || '';
  const dur = event.dur || event.duration || '';
  const seed = title + venue;
  return (
    <div className="event-row" role="button" tabIndex={0}>
      <div className="event-time">
        {time || '—'}
        {dur && <span className="dur">{dur}</span>}
      </div>
      <div className="event-body">
        <div className="event-title">{title}</div>
        {venue && <div className="event-venue">{venue}</div>}
      </div>
      <Glyph mono={event.mono || monoFor(title)} tone={(event.tone as 'a' | 'b' | 'c' | 'd' | 'e' | 'f') || toneFor(seed)} size="sm" />
    </div>
  );
}


// ── Calendar preview types (from morning-brief `calendar_preview` block) ──

interface CalendarDayEvent {
  title: string;
  time?: string;
  location?: string;
}
interface CalendarDay {
  label?: string;
  day?: string;
  events: CalendarDayEvent[] | number;
  energy?: string;
  freeEvening?: boolean;
  suggestion?: string;
}
interface CalendarPreviewData {
  energy?: string;
  days?: CalendarDay[];
}

function dayCount(d: CalendarDay): number {
  return typeof d.events === 'number' ? d.events : (d.events ?? []).length;
}
function dayEvents(d: CalendarDay): CalendarDayEvent[] {
  return typeof d.events === 'number' ? [] : (d.events ?? []);
}

// ── Week ahead mini bar chart ────────────────────────────

function WeekPreviewMini({ days }: { days?: CalendarDay[] }) {
  const list = (days ?? []).slice(0, 7);
  const hasRealData = list.length > 0;

  // Always render 7 slots — pad with zeros if skill sent fewer days.
  const fallbackLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const bars = Array.from({ length: 7 }, (_, i) => list[i] ? dayCount(list[i]) : 0);
  const labels = Array.from({ length: 7 }, (_, i) => {
    const lab = (list[i]?.label || list[i]?.day || '').trim();
    return lab ? lab.slice(0, 1).toUpperCase() : fallbackLabels[i];
  });
  const energies = Array.from({ length: 7 }, (_, i) => list[i]?.energy || '');

  const max = Math.max(...bars, 1);
  const total = bars.reduce((a, b) => a + b, 0);
  const freeEvenings = list.filter((d) => dayCount(d) <= 1 || d.freeEvening).length;

  return (
    <div className="tp-card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Week ahead</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
          {hasRealData ? `${total} event${total === 1 ? '' : 's'}` : '—'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, alignItems: 'end' }}>
        {bars.map((c, i) => (
          <div key={i} style={{ textAlign: 'center' }} title={energies[i] ? `${labels[i]} · ${energies[i]}` : labels[i]}>
            <div
              style={{
                height: 6 + (c / max) * 38,
                background: i === 0 ? 'var(--accent)' : 'var(--line-2)',
                borderRadius: 3,
                marginBottom: 6,
                opacity: hasRealData ? 1 : 0.4,
              }}
            />
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: i === 0 ? 'var(--accent)' : 'var(--text-3)' }}>
              {labels[i]}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-4)', marginTop: 1 }}>
              {hasRealData ? c : '·'}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {!hasRealData ? (
          <Chip>No calendar preview</Chip>
        ) : (
          <>
            {freeEvenings > 0 && <Chip>{freeEvenings} free evening{freeEvenings === 1 ? '' : 's'}</Chip>}
          </>
        )}
      </div>
    </div>
  );
}


// ── Today's reads digest row ─────────────────────────────

interface ArticleData {
  title?: string; source?: string; topic?: string; url?: string;
  readingTimeMinutes?: number; minutes?: number;
  isDiscovery?: boolean;
}

// ── Worth noting (Wave 2) ───────────────────────────────
// Expanded replacement for the old "Worth Knowing" section. Aggregates
// email/admin notes from the morning-brief skill, recent reading discoveries,
// and rotating picks from the places DB.

interface PlacePick {
  id: string;
  name: string;
  category?: string;
  area?: string;
  cuisine_tags?: string[];
  vibe_tags?: string[];
  // Postgres NUMERIC returns as a string via @vercel/postgres. Accept both.
  google_rating?: number | string | null;
  google_maps_url?: string;
  website?: string;
}

function ratingNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function WorthNoting({
  emailTexts,
  readingPicks,
  placesPicks,
  loading,
}: {
  emailTexts: string[];
  readingPicks: ArticleData[];
  placesPicks: PlacePick[];
  loading: boolean;
}) {
  const hasAny = emailTexts.length > 0 || readingPicks.length > 0 || placesPicks.length > 0;
  if (!hasAny && !loading) return null;

  return (
    <>
      <SectionLabel>Worth noting</SectionLabel>
      <div className="tp-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Admin / email notes from the morning-brief skill */}
        {emailTexts.length > 0 && (
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
              From your inbox
            </div>
            {emailTexts.map((t, i) => (
              <div
                key={i}
                style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-line', marginTop: i === 0 ? 0 : 10 }}
              >
                {t}
              </div>
            ))}
          </div>
        )}

        {/* Reading discoveries */}
        {readingPicks.length > 0 && (
          <div style={{ padding: '14px 16px', borderBottom: placesPicks.length > 0 ? '1px solid var(--line)' : 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
              Discoveries to read
            </div>
            {readingPicks.map((a, i) => {
              const open = () => a.url && window.open(a.url, '_blank', 'noopener,noreferrer');
              return (
                <button
                  key={i}
                  onClick={open}
                  type="button"
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0,
                    padding: i === 0 ? '2px 0' : '8px 0 2px', cursor: a.url ? 'pointer' : 'default', color: 'inherit',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>{a.title || 'Untitled'}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                    {a.source && <span><b>{a.source}</b></span>}
                    {a.minutes !== undefined && <span> · {a.minutes} min</span>}
                    {(a.readingTimeMinutes !== undefined && a.minutes === undefined) && <span> · {a.readingTimeMinutes} min</span>}
                    {a.topic && <span> · {a.topic}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Places worth a revisit / seasonal */}
        {placesPicks.length > 0 && (
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
              Places on the radar
            </div>
            {placesPicks.map((p, i) => {
              const url = p.google_maps_url || p.website;
              const open = () => url && window.open(url, '_blank', 'noopener,noreferrer');
              const tags = [p.area, p.category, ...(p.cuisine_tags ?? []).slice(0, 2)].filter(Boolean).join(' · ');
              const rating = ratingNumber(p.google_rating);
              return (
                <button
                  key={p.id}
                  onClick={open}
                  type="button"
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0,
                    padding: i === 0 ? '2px 0' : '8px 0 2px', cursor: url ? 'pointer' : 'default', color: 'inherit',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                    {tags}
                    {rating !== null && <span> · ★ {rating.toFixed(1)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {loading && !hasAny && (
          <div style={{ padding: 16, color: 'var(--text-3)', fontSize: 13 }}>Gathering…</div>
        )}
      </div>
    </>
  );
}

function ArticleRow({ article, index }: { article: ArticleData; index: number }) {
  const title = article.title || 'Untitled';
  const source = article.source || '';
  const topic = article.topic || '';
  const minutes = article.readingTimeMinutes ?? article.minutes;
  const url = article.url;

  const open = () => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button className="article" onClick={open} type="button">
      <div className="article-num">{String(index + 1).padStart(2, '0')}</div>
      <div>
        <div className="article-title">{title}</div>
        <div className="article-meta">
          {source && <span><b>{source}</b></span>}
          {minutes !== undefined && <span>· {minutes} min</span>}
          {topic && <span>· {topic}</span>}
          {article.isDiscovery && <span style={{ color: 'var(--accent)' }}>· discovery</span>}
        </div>
      </div>
    </button>
  );
}


// ── Main component ───────────────────────────────────────

export function BriefScreen() {
  const [briefMsg, setBriefMsg] = useState<MessageRow | null>(null);
  const [readingMsg, setReadingMsg] = useState<MessageRow | null>(null);
  const [placesPicks, setPlacesPicks] = useState<PlacePick[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    const [briefRes, readingRes, placesRes] = await Promise.all([
      fetch('/api/messages?taskId=morning-brief&limit=1').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/messages?taskId=smart-reading-digest&limit=1').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/places?limit=50').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    setBriefMsg(briefRes?.messages?.[0] ?? null);
    setReadingMsg(readingRes?.messages?.[0] ?? null);
    // Rotate 3 random places each load to keep "worth noting" feeling fresh.
    const allPlaces: PlacePick[] = placesRes?.places ?? [];
    const enriched = allPlaces.filter((p) => p.name && (p.google_rating || p.website || p.google_maps_url));
    const shuffled = [...enriched].sort(() => Math.random() - 0.5).slice(0, 3);
    setPlacesPicks(shuffled);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  // Parse blocks in order so we can group section_header + text pairs and
  // keep the original presentation flow from the morning-brief skill.
  const blocks = briefMsg?.blocks ?? [];
  let weatherData: WeatherData | undefined;
  let calendarPreview: CalendarPreviewData | undefined;
  const whatsOn: EventData[] = [];
  const briefSections: { header: string; texts: string[] }[] = [];
  const standaloneTexts: string[] = [];
  const worthNotingTexts: string[] = [];
  let currentSection: { header: string; texts: string[] } | null = null;
  let skipCurrentSection = false;
  let currentIsWorthNoting = false;

  // Wave 2: Tonight's Pick and On Your Plate are out. Worth Knowing becomes
  // Worth noting and gets surfaced via a richer custom renderer below.
  const isFilteredHeader = (h: string) => /tonight|plate/i.test(h);
  const isWorthNotingHeader = (h: string) => /worth\s+(noting|knowing)/i.test(h);

  for (const block of blocks) {
    const data = (block.data ?? block) as Record<string, unknown>;
    switch (block.type) {
      case 'header':
        // suppress — the screen has its own greeting
        break;
      case 'weather_card':
        weatherData = data as WeatherData;
        break;
      case 'calendar_preview':
        calendarPreview = data as CalendarPreviewData;
        break;
      case 'event_card':
        whatsOn.push(data as EventData);
        break;
      case 'section_header': {
        const text = String(data.text ?? data.content ?? data.title ?? '').trim();
        if (isFilteredHeader(text)) {
          skipCurrentSection = true;
          currentIsWorthNoting = false;
          currentSection = null;
          break;
        }
        skipCurrentSection = false;
        if (isWorthNotingHeader(text)) {
          currentIsWorthNoting = true;
          currentSection = null;
          break;
        }
        currentIsWorthNoting = false;
        currentSection = { header: text, texts: [] };
        briefSections.push(currentSection);
        break;
      }
      case 'text': {
        const text = String(data.text ?? data.content ?? data.title ?? '').trim();
        if (!text) break;
        if (skipCurrentSection) break;
        if (currentIsWorthNoting) { worthNotingTexts.push(text); break; }
        if (currentSection) currentSection.texts.push(text);
        else standaloneTexts.push(text);
        break;
      }
      default:
        break;
    }
  }

  // Today = first day in calendar_preview. Week ahead = all days.
  const days = calendarPreview?.days ?? [];
  const todayCal = days[0];
  const todayEvents: CalendarDayEvent[] = todayCal ? dayEvents(todayCal) : [];
  const nextTodayEvent = todayEvents[0];
  const nextEvent: EventData | undefined = nextTodayEvent
    ? { title: nextTodayEvent.title, venue: nextTodayEvent.location, time: nextTodayEvent.time }
    : undefined;

  const articleBlocks = (readingMsg?.blocks ?? []).filter((b) => b.type === 'article_card');
  const articles = articleBlocks.map((b) => (b.data ?? b) as ArticleData);
  // Discovery picks feed Worth noting; cap at 3 to keep the card scan-able.
  const readingPicks = articles.filter((a) => a.isDiscovery).slice(0, 3);

  const now = new Date();

  return (
    <div>
      <div className="brief-hero" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="greeting">{getGreeting()}, Will.</h1>
          <div className="greeting-date">{formatLongDate(now)} · London</div>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="tp-btn ghost sm"
          aria-label="Refresh"
          style={{ flexShrink: 0 }}
        >
          <Icon name="refresh" size={14} />
        </button>
      </div>


      <div className="brief-grid">
        {/* Left column — weather + next-up + today's events */}
        <div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
            {weatherData ? (
              <WeatherBlock data={weatherData} />
            ) : (
              <div className="weather" style={{ opacity: 0.5 }}>
                <div>
                  <div className="weather-temp">—</div>
                  <div className="weather-cond">Weather unavailable</div>
                </div>
              </div>
            )}
            {nextEvent ? (
              <NextUp event={nextEvent} />
            ) : (
              <div className="nextup" style={{ opacity: 0.6 }}>
                <div className="nextup-time">NEXT UP</div>
                <div className="nextup-title">Nothing scheduled</div>
                <div className="nextup-meta">Your calendar is clear</div>
              </div>
            )}
          </div>

          <SectionLabel
            count={todayEvents.length}
            right={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-4)' }}>{formatShortDate(now)}</span>}
          >
            Today
          </SectionLabel>
          <div className="tp-card flat">
            {loading ? (
              <div style={{ padding: 24, color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
            ) : !calendarPreview ? (
              <div style={{ padding: 24, color: 'var(--text-3)', fontSize: 13 }}>
                No calendar preview in today&rsquo;s brief.
              </div>
            ) : todayEvents.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--text-3)', fontSize: 13 }}>
                Nothing on your calendar today.
              </div>
            ) : (
              todayEvents.map((e, i) => (
                <EventRow
                  key={i}
                  event={{ title: e.title, venue: e.location, time: e.time }}
                />
              ))
            )}
          </div>

          {/* What's on — activity suggestions from the Activity Engine */}
          {whatsOn.length > 0 && (
            <>
              <div style={{ height: 20 }} />
              <SectionLabel count={whatsOn.length}>What&rsquo;s on</SectionLabel>
              <div className="tp-card flat">
                {whatsOn.map((e, i) => <EventRow key={i} event={e} />)}
              </div>
            </>
          )}

          {/* Worth noting — expanded: inbox highlights + reading discoveries + places */}
          {(worthNotingTexts.length > 0 || readingPicks.length > 0 || placesPicks.length > 0 || loading) && (
            <>
              <div style={{ height: 20 }} />
              <WorthNoting
                emailTexts={worthNotingTexts}
                readingPicks={readingPicks}
                placesPicks={placesPicks}
                loading={loading}
              />
            </>
          )}

          {/* Standalone text blocks (e.g. "picked up" acknowledgement) */}
          {standaloneTexts.length > 0 && (
            <>
              <div style={{ height: 20 }} />
              {standaloneTexts.map((t, i) => (
                <div
                  key={i}
                  className="tp-card"
                  style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10, whiteSpace: 'pre-line' }}
                >
                  {t}
                </div>
              ))}
            </>
          )}

          {/* Named sections — Worth Knowing (email scan), On Your Plate (Asana), etc. */}
          {briefSections.map((s, i) => (
            <div key={i}>
              <div style={{ height: 20 }} />
              <SectionLabel>{s.header || 'Notes'}</SectionLabel>
              <div className="tp-card" style={{ padding: '14px 16px' }}>
                {s.texts.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>—</div>
                ) : (
                  s.texts.map((t, j) => (
                    <div
                      key={j}
                      style={{
                        fontSize: 13,
                        color: 'var(--text-2)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-line',
                        marginTop: j === 0 ? 0 : 10,
                      }}
                    >
                      {t}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right column — week ahead + today's reads */}
        <div>
          <SectionLabel>Week ahead</SectionLabel>
          <WeekPreviewMini days={calendarPreview?.days} />
          <div style={{ height: 20 }} />
          <SectionLabel count={articles.length}>Today&rsquo;s reads</SectionLabel>
          {articles.length === 0 ? (
            <div style={{ padding: '14px 0', color: 'var(--text-3)', fontSize: 13 }}>
              {loading ? 'Loading…' : 'Reading digest runs at 7am.'}
            </div>
          ) : (
            articles.map((a, i) => <ArticleRow key={i} article={a} index={i} />)
          )}
        </div>
      </div>
    </div>
  );
}
