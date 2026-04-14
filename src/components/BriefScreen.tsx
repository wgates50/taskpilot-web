'use client';

import { useState, useEffect, useCallback } from 'react';
import { WeatherCard } from './cards/WeatherCard';
import { EventCard } from './cards/EventCard';
import { ArticleCard } from './cards/ArticleCard';
import { CalendarPreviewCard } from './cards/CalendarPreviewCard';
// Task metadata no longer needed after reply strip removal

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

function formatDay(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Block renderer (document style, not chat bubbles) ────

function BriefBlock({ block: rawBlock }: { block: Block }) {
  const block: Block = {
    type: rawBlock.type,
    data: (rawBlock.data as Record<string, unknown>) || (rawBlock as Record<string, unknown>),
  };

  const getText = (data: Record<string, unknown>): string =>
    String(data.text ?? data.content ?? data.title ?? '');

  switch (block.type) {
    case 'header':
      // Suppress generic "Morning Brief" headers — we have our own
      return null;

    case 'weather_card':
      return <WeatherCard data={block.data} />;

    case 'calendar_preview':
      return <CalendarPreviewCard data={block.data} />;

    case 'event_card':
      return <EventCard data={block.data} />;

    case 'article_card':
      return <ArticleCard data={block.data} />;

    case 'section_header': {
      const text = getText(block.data);
      return (
        <div className="flex items-center gap-2 pt-1 pb-0.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
            {text}
          </p>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      );
    }

    case 'text': {
      const text = getText(block.data);
      if (!text) return null;
      return (
        <div className="bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
          <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>
        </div>
      );
    }

    default:
      return null;
  }
}

// ── Main Component ───────────────────────────────────────

export function BriefScreen() {
  const [briefMsg, setBriefMsg] = useState<MessageRow | null>(null);
  const [readingMsg, setReadingMsg] = useState<MessageRow | null>(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [readingLoading, setReadingLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBrief = useCallback(async () => {
    try {
      const res = await fetch('/api/messages?taskId=morning-brief&limit=1');
      if (res.ok) {
        const data = await res.json();
        setBriefMsg(data.messages?.[0] ?? null);
      }
    } catch (e) {
      console.error('Failed to fetch brief:', e);
    } finally {
      setBriefLoading(false);
    }
  }, []);

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
      setReadingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrief();
    fetchReading();
  }, [fetchBrief, fetchReading]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBrief(), fetchReading()]);
    setRefreshing(false);
  };

  // Extract article blocks from reading digest
  const articleBlocks = (readingMsg?.blocks ?? []).filter(b => b.type === 'article_card');

  // Brief content blocks (exclude header + article_cards — articles come from reading digest)
  const briefBlocks = (briefMsg?.blocks ?? []).filter(b => b.type !== 'article_card');

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b px-4 pt-12 lg:pt-4 pb-3 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{getGreeting()}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{formatDay(new Date())}</p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="p-2 -mr-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-24">
        {/* Desktop: two-column layout — brief on left, reads on right */}
        <div className="lg:grid lg:grid-cols-5 lg:gap-6 mt-4">

          {/* ── Left: Morning Brief (3/5 on desktop) ── */}
          <div className="lg:col-span-3">
            {briefLoading ? (
              <div className="space-y-3">
                {[80, 56, 96, 64].map((w, i) => (
                  <div key={i} className="bg-gray-200 animate-pulse rounded-xl h-20" style={{ opacity: 1 - i * 0.15 }} />
                ))}
              </div>
            ) : briefMsg ? (
              <div className="space-y-2.5">
                <span className="text-[10px] text-gray-400">
                  Morning Brief · {timeAgo(briefMsg.timestamp)}
                </span>
                {briefBlocks.map((block, i) => (
                  <BriefBlock key={i} block={block} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">☀️</p>
                <p className="text-sm font-medium text-gray-700">No brief yet today</p>
                <p className="text-xs text-gray-400 mt-1">Your morning brief runs at 6 AM</p>
              </div>
            )}
          </div>

          {/* ── Right: Today's Reads (2/5 on desktop) ── */}
          <div className="lg:col-span-2 mt-5 lg:mt-0">
            {readingLoading ? (
              <div className="space-y-3">
                <div className="bg-gray-200 animate-pulse rounded-xl h-28" />
                <div className="bg-gray-200 animate-pulse rounded-xl h-28 opacity-70" />
              </div>
            ) : articleBlocks.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 pb-0.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Today&apos;s Reads
                  </p>
                  <div className="flex-1 h-px bg-gray-200" />
                  {readingMsg && (
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {timeAgo(readingMsg.timestamp)}
                    </span>
                  )}
                </div>
                {articleBlocks.map((block, i) => (
                  <ArticleCard key={i} data={block.data as Record<string, unknown>} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

    </div>
  );
}
