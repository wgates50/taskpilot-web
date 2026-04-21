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


// ── Week ahead mini bar chart ────────────────────────────

function WeekPreviewMini({ counts }: { counts?: number[] }) {
  const bars = counts && counts.length === 7 ? counts : [3, 2, 4, 1, 3, 2, 2];
  const max = Math.max(...bars, 1);
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const total = bars.reduce((a, b) => a + b, 0);
  const freeEvenings = bars.filter((c) => c <= 1).length;
  return (
    <div className="tp-card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Week ahead</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
          {total} event{total === 1 ? '' : 's'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, alignItems: 'end' }}>
        {bars.map((c, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div
              style={{
                height: 6 + (c / max) * 38,
                background: i === 0 ? 'var(--accent)' : 'var(--line-2)',
                borderRadius: 3,
                marginBottom: 6,
              }}
            />
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: i === 0 ? 'var(--accent)' : 'var(--text-3)' }}>
              {days[i]}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-4)', marginTop: 1 }}>{c}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        <Chip>Balanced</Chip>
        {freeEvenings > 0 && <Chip>{freeEvenings} free evening{freeEvenings === 1 ? '' : 's'}</Chip>}
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    const [briefRes, readingRes] = await Promise.all([
      fetch('/api/messages?taskId=morning-brief&limit=1').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/messages?taskId=smart-reading-digest&limit=1').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    setBriefMsg(briefRes?.messages?.[0] ?? null);
    setReadingMsg(readingRes?.messages?.[0] ?? null);
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

  // Parse blocks into the shapes the new design needs.
  const blocks = briefMsg?.blocks ?? [];
  const weatherBlock = blocks.find((b) => b.type === 'weather_card');
  const eventBlocks = blocks.filter((b) => b.type === 'event_card');
  const weatherData = (weatherBlock?.data ?? weatherBlock) as WeatherData | undefined;
  const events = eventBlocks.map((b) => (b.data ?? b) as EventData);
  const nextEvent = events[0];

  const articleBlocks = (readingMsg?.blocks ?? []).filter((b) => b.type === 'article_card');
  const articles = articleBlocks.slice(0, 3).map((b) => (b.data ?? b) as ArticleData);

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
            count={events.length}
            right={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-4)' }}>{formatShortDate(now)}</span>}
          >
            Today
          </SectionLabel>
          <div className="tp-card flat">
            {loading ? (
              <div style={{ padding: 24, color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
            ) : events.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--text-3)', fontSize: 13 }}>No events today.</div>
            ) : (
              events.map((e, i) => <EventRow key={i} event={e} />)
            )}
          </div>
        </div>

        {/* Right column — week ahead + today's reads */}
        <div>
          <SectionLabel>Week ahead</SectionLabel>
          <WeekPreviewMini />
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
