'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArticleCard } from './cards/ArticleCard';
import { ThreadDetail } from './ThreadDetail';
import { TASKS, type TaskMeta } from '@/lib/tasks';

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

// ── Constants ────────────────────────────────────────────

// Tasks that appear in the "Other Updates" section of Reading tab
const OTHER_TASK_IDS = [
  'finance-tracker',
  'weekly-planner',
  'job-alert-scanner',
  'monthly-life-admin',
  'visit-review',
];

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

function getTextPreview(blocks: Block[]): string {
  for (const b of blocks) {
    const data = (b.data as Record<string, unknown>) || (b as Record<string, unknown>);
    if (b.type === 'article_card') {
      return String(data.title || '');
    }
    if (b.type === 'text') {
      const text = String(data.text ?? data.content ?? '');
      if (text) return text.slice(0, 100) + (text.length > 100 ? '…' : '');
    }
    if (b.type === 'header') {
      return String(data.text ?? data.title ?? '');
    }
  }
  return '';
}

// ── Sub-components ───────────────────────────────────────

function OtherTaskCard({
  task,
  latestMsg,
  onOpen,
}: {
  task: TaskMeta;
  latestMsg: MessageRow | null;
  onOpen: () => void;
}) {
  const preview = latestMsg ? getTextPreview(latestMsg.blocks) : null;

  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl shrink-0">{task.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-gray-900 truncate">{task.name}</p>
            {latestMsg && (
              <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(latestMsg.timestamp)}</span>
            )}
          </div>
          <p className="text-[12px] text-gray-500 truncate mt-0.5">
            {preview || task.description}
          </p>
        </div>
        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </button>
  );
}

// ── Main Component ───────────────────────────────────────

export function ReadingScreen() {
  const [readingMsg, setReadingMsg] = useState<MessageRow | null>(null);
  const [readingLoading, setReadingLoading] = useState(true);
  const [otherLatest, setOtherLatest] = useState<Record<string, MessageRow | null>>({});
  const [selectedTask, setSelectedTask] = useState<TaskMeta | null>(null);

  const otherTasks = TASKS.filter(t => OTHER_TASK_IDS.includes(t.id) && !t.retired);

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

  const fetchOtherLatest = useCallback(async () => {
    const results: Record<string, MessageRow | null> = {};
    await Promise.all(
      otherTasks.map(async (task) => {
        try {
          const res = await fetch(`/api/messages?taskId=${task.id}&limit=1`);
          if (res.ok) {
            const data = await res.json();
            results[task.id] = data.messages?.[0] ?? null;
          } else {
            results[task.id] = null;
          }
        } catch {
          results[task.id] = null;
        }
      })
    );
    setOtherLatest(results);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchReading();
    fetchOtherLatest();
  }, [fetchReading, fetchOtherLatest]);

  // ── Thread detail (full-screen within this tab) ──
  if (selectedTask) {
    return (
      <ThreadDetail
        task={selectedTask}
        onBack={() => setSelectedTask(null)}
      />
    );
  }

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
      <div className="flex-1 overflow-y-auto px-4 pb-24">

        {/* Reading Digest */}
        <div className="mt-4">
          {readingLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-200 animate-pulse rounded-xl h-28" style={{ opacity: 1 - (i - 1) * 0.2 }} />
              ))}
            </div>
          ) : articleBlocks.length > 0 ? (
            <div className="space-y-2.5">
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

        {/* Other Updates */}
        {otherTasks.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                Other Updates
              </p>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-2">
              {otherTasks.map(task => (
                <OtherTaskCard
                  key={task.id}
                  task={task}
                  latestMsg={otherLatest[task.id] ?? null}
                  onOpen={() => setSelectedTask(task)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
