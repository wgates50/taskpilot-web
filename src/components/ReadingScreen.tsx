'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArticleCard } from './cards/ArticleCard';
// Task metadata kept for potential future use

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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Main Component ───────────────────────────────────────

export function ReadingScreen() {
  const [readingMsg, setReadingMsg] = useState<MessageRow | null>(null);
  const [readingLoading, setReadingLoading] = useState(true);

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
    fetchReading();
  }, [fetchReading]);

  const articleBlocks = (readingMsg?.blocks ?? []).filter(b => b.type === 'article_card');

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 pt-12 lg:pt-4 pb-3 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Reading</h1>
        {readingMsg && (
          <p className="text-xs text-gray-400 mt-0.5">
            Digest updated {timeAgo(readingMsg.timestamp)}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-24">

        {/* Reading Digest */}
        <div className="mt-4">
          {readingLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-200 animate-pulse rounded-xl h-28" style={{ opacity: 1 - (i - 1) * 0.2 }} />
              ))}
            </div>
          ) : articleBlocks.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {articleBlocks.map((block, i) => (
                <ArticleCard key={i} data={block.data as Record<string, unknown>} />
              ))}
            </div>
          ) : (
            <div className="mt-4 text-center py-8">
              <p className="text-2xl mb-2">📰</p>
              <p className="text-sm font-medium text-gray-700">No reading digest yet today</p>
              <p className="text-xs text-gray-400 mt-1">Your reading digest runs at 12 PM</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
