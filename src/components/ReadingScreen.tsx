'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Glyph, type GlyphTone } from './ui/Glyph';
import { Chip } from './ui/Chip';
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

interface ArticleData {
  id?: string;
  title?: string;
  source?: string;
  topic?: string;
  topicEmoji?: string;
  url?: string;
  summary?: string;
  readingTimeMinutes?: number;
  minutes?: number;
  isDiscovery?: boolean;
  mono?: string;
  tone?: GlyphTone;
}

// ── Helpers ──────────────────────────────────────────────

const TONES: readonly GlyphTone[] = ['a', 'b', 'c', 'd', 'e', 'f'];
function hashId(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return `saved-article-${Math.abs(h).toString(36)}`;
}
function toneFor(seed: string): GlyphTone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return TONES[Math.abs(h) % TONES.length];
}
function monoFor(str: string): string {
  const clean = (str || '').trim();
  if (!clean) return '·';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}


// ── Article big row ──────────────────────────────────────

function ArticleBig({
  article, index,
  reaction, onReact,
  saved, onSave,
}: {
  article: ArticleData;
  index: number;
  reaction: 'up' | 'down' | null;
  onReact: (id: string, type: 'up' | 'down') => void;
  saved: boolean;
  onSave: (id: string) => void;
}) {
  const id = article.id || hashId(article.url || article.title || String(index));
  const title = article.title || 'Untitled';
  const source = article.source || '';
  const minutes = article.readingTimeMinutes ?? article.minutes;
  const summary = article.summary || '';
  const isDiscovery = Boolean(article.isDiscovery);
  const mono = article.mono || monoFor(source || title);
  const tone = article.tone || toneFor(source || title);

  const open = () => {
    if (article.url) window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="article-big">
      <div className="article-num">{String(index + 1).padStart(2, '0')}</div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <Glyph mono={mono} tone={tone} size="sm" />
          {source && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-2)', fontWeight: 500 }}>
              {source}
            </span>
          )}
          {minutes !== undefined && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-4)' }}>
              · {minutes} MIN
            </span>
          )}
          {isDiscovery && <Chip variant="accent">Discovery</Chip>}
        </div>
        <h3 onClick={open} style={{ cursor: 'pointer' }}>{title}</h3>
        {summary && <p className="summary">{summary}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <button className="tp-btn sm" onClick={open} type="button">
            Read <span className="tp-kbd">↵</span>
          </button>
          <button
            className="tp-btn sm"
            onClick={() => onSave(id)}
            type="button"
            style={saved ? { color: 'var(--accent)', borderColor: 'var(--accent-soft)' } : {}}
          >
            <Icon name="bookmark" size={11} /> {saved ? 'Saved' : 'Save'}
          </button>
          <div className="reaction" style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <button
              className={`react-btn up ${reaction === 'up' ? 'active' : ''}`}
              onClick={() => onReact(id, 'up')}
              title="More like this"
              type="button"
            >
              <Icon name="thumbUp" size={13} />
            </button>
            <button
              className={`react-btn down ${reaction === 'down' ? 'active' : ''}`}
              onClick={() => onReact(id, 'down')}
              title="Less like this"
              type="button"
            >
              <Icon name="thumbDown" size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Main component ───────────────────────────────────────

type FilterId = 'all' | 'discovery' | 'saved' | string;

export function ReadingScreen() {
  const [readingMsg, setReadingMsg] = useState<MessageRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>('all');
  const [reactions, setReactions] = useState<Record<string, 'up' | 'down' | null>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const fetchReading = useCallback(async () => {
    try {
      const res = await fetch('/api/messages?taskId=smart-reading-digest&limit=1');
      if (res.ok) {
        const data = await res.json();
        setReadingMsg(data.messages?.[0] ?? null);
      }
    } catch (e) {
      console.error('Failed to fetch reading digest:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSaved = useCallback(async () => {
    try {
      const res = await fetch('/api/saved');
      if (res.ok) {
        const data = await res.json();
        const ids = new Set<string>((data.items ?? []).map((it: { id: string }) => it.id));
        setSavedIds(ids);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchReading();
    fetchSaved();
  }, [fetchReading, fetchSaved]);

  const articles = useMemo<ArticleData[]>(
    () =>
      (readingMsg?.blocks ?? [])
        .filter((b) => b.type === 'article_card')
        .map((b) => (b.data ?? b) as ArticleData),
    [readingMsg],
  );

  // Topics derived from data (stable order: core topics first, then everything else seen)
  const topics = useMemo<string[]>(() => {
    const seen = new Set<string>();
    for (const a of articles) if (a.topic) seen.add(a.topic.toLowerCase());
    const preferred = ['tech', 'culture', 'food', 'travel', 'science', 'design', 'finance', 'music', 'sport', 'london'];
    const ordered = preferred.filter((t) => seen.has(t));
    for (const t of seen) if (!ordered.includes(t)) ordered.push(t);
    return ordered;
  }, [articles]);

  const filterTabs: FilterId[] = ['all', 'discovery', 'saved', ...topics];

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (filter === 'all') return true;
      const id = a.id || hashId(a.url || a.title || '');
      if (filter === 'discovery') return a.isDiscovery;
      if (filter === 'saved') return savedIds.has(id);
      return (a.topic || '').toLowerCase() === filter;
    });
  }, [articles, filter, savedIds]);

  const totalMin = articles.reduce((s, a) => s + (a.readingTimeMinutes ?? a.minutes ?? 0), 0);
  const updated = readingMsg ? timeAgo(readingMsg.timestamp) : null;


  // ── Actions ────────────────────────────────────────────

  const react = async (id: string, type: 'up' | 'down') => {
    const current = reactions[id] ?? null;
    const next = current === type ? null : type;
    setReactions((prev) => ({ ...prev, [id]: next }));
    try {
      await fetch('/api/profile/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: 'smart-reading-digest',
          item_id: id,
          reaction: next,
        }),
      });
    } catch {
      /* silent */
    }
  };

  const toggleSave = async (id: string) => {
    const article = articles.find(
      (a) => (a.id || hashId(a.url || a.title || '')) === id,
    );
    if (!article) return;
    const currentlySaved = savedIds.has(id);
    // Optimistic UI
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (currentlySaved) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      if (currentlySaved) {
        await fetch(`/api/saved/${id}`, { method: 'DELETE' });
      } else {
        await fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            title: article.title,
            url: article.url,
            category: article.topic,
            tags: [article.source, article.isDiscovery ? 'discovery' : null].filter(Boolean),
            reason: article.summary,
            source_task_id: 'smart-reading-digest',
          }),
        });
      }
    } catch {
      /* silent; keep optimistic state */
    }
  };


  // ── Render ─────────────────────────────────────────────

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
        <h1 className="greeting" style={{ fontSize: 24 }}>Today&rsquo;s digest</h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
          {articles.length} item{articles.length === 1 ? '' : 's'}
          {totalMin > 0 && ` · ${totalMin} min total`}
          {updated && ` · updated ${updated}`}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {filterTabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`reading-topic-chip ${filter === t ? 'active' : ''}`}
            onClick={() => setFilter(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
            {t === 'saved' && savedIds.size > 0 && (
              <span style={{ marginLeft: 4, opacity: 0.7 }}>· {savedIds.size}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em' }}>LOADING</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em' }}>NO ITEMS</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            {articles.length === 0
              ? 'Reading digest runs at 12:00 daily.'
              : 'Nothing matches this filter.'}
          </div>
        </div>
      ) : (
        <div className="reading-grid">
          {filtered.map((a, i) => {
            const id = a.id || hashId(a.url || a.title || '');
            return (
              <ArticleBig
                key={id}
                article={a}
                index={i}
                reaction={reactions[id] ?? null}
                onReact={react}
                saved={savedIds.has(id)}
                onSave={toggleSave}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
