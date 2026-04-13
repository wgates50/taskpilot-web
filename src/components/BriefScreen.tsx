'use client';

import { useState, useEffect, useCallback } from 'react';
import { WeatherCard } from './cards/WeatherCard';
import { EventCard } from './cards/EventCard';
import { ArticleCard } from './cards/ArticleCard';
import { CalendarPreviewCard } from './cards/CalendarPreviewCard';
import { TASK_MAP } from '@/lib/tasks';

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
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">
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
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const briefTask = TASK_MAP['morning-brief'];

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

  const sendReply = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    setInput('');
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'morning-brief',
          blocks: [{ type: 'text', data: { text } }],
          timestamp: new Date().toISOString(),
          isFromUser: true,
        }),
      });
    } catch (e) {
      console.error('Failed to send reply:', e);
    } finally {
      setSending(false);
    }
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
      <div className="flex-1 overflow-y-auto px-4 pb-32">

        {/* Morning Brief blocks */}
        {briefLoading ? (
          <div className="mt-6 space-y-3">
            {[80, 56, 96, 64].map((w, i) => (
              <div key={i} className="bg-gray-200 animate-pulse rounded-xl h-20" style={{ opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        ) : briefMsg ? (
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-gray-400">
                Morning Brief · {timeAgo(briefMsg.timestamp)}
              </span>
            </div>
            {briefBlocks.map((block, i) => (
              <BriefBlock key={i} block={block} />
            ))}
          </div>
        ) : (
          <div className="mt-10 text-center">
            <p className="text-3xl mb-2">☀️</p>
            <p className="text-sm font-medium text-gray-700">No brief yet today</p>
            <p className="text-xs text-gray-400 mt-1">Your morning brief runs at 6 AM</p>
          </div>
        )}

        {/* Today's Reads */}
        {!readingLoading && articleBlocks.length > 0 && (
          <div className="mt-5 space-y-2.5">
            <div className="flex items-center gap-2 pt-1 pb-0.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">
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
        )}

        {readingLoading && (
          <div className="mt-5">
            <div className="bg-gray-200 animate-pulse rounded-xl h-28" />
          </div>
        )}
      </div>

      {/* ── Reply strip ── */}
      <div className="shrink-0 border-t bg-white/95 backdrop-blur-sm">
        {/* Quick replies */}
        {briefTask?.quickReplies && briefTask.quickReplies.length > 0 && (
          <div className="flex gap-1.5 px-4 pt-2.5 overflow-x-auto">
            {briefTask.quickReplies.map(reply => (
              <button
                key={reply}
                onClick={() => sendReply(reply)}
                className="px-3 py-1.5 text-[12px] font-medium text-blue-600 bg-blue-50 rounded-full whitespace-nowrap hover:bg-blue-100 transition-colors shrink-0"
              >
                {reply}
              </button>
            ))}
          </div>
        )}
        {/* Text input */}
        <div className="flex items-center gap-2 px-4 py-2 pb-6">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendReply(input)}
            placeholder="Reply to your brief…"
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            onClick={() => sendReply(input)}
            disabled={!input.trim() || sending}
            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-30 shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
