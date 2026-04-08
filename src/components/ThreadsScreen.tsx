'use client';

import { useState } from 'react';
import { TASKS, TASK_GROUPS, type TaskMeta } from '@/lib/tasks';
import type { LatestMessage } from '@/app/page';

interface Props {
  latestMessages: Record<string, LatestMessage>;
  unreads: Record<string, number>;
  pins: string[];
  onOpenThread: (task: TaskMeta) => void;
  onTogglePin: (taskId: string) => void;
}

const GROUP_COLORS: Record<string, string> = {
  calendar: '#3B82F6',
  reading: '#8B5CF6',
  finance: '#10B981',
  career: '#F59E0B',
};

function getRelativeTime(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return date.toLocaleDateString('en-GB', { weekday: 'short' });
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getMessagePreview(blocks: unknown[]): string {
  for (const block of blocks as Array<{ type: string; data?: Record<string, unknown> }>) {
    if (!block.data) continue;
    if (block.type === 'text') return String(block.data.text ?? '').split('\n')[0].slice(0, 80);
    if (block.type === 'header') return String(block.data.text ?? '').slice(0, 80);
    if (block.type === 'weather_card') return `${block.data.conditions ?? ''}, ${block.data.temp ?? ''}°C`;
    if (block.type === 'event_card') return String(block.data.title ?? '');
    if (block.type === 'article_card') return String(block.data.title ?? '');
    if (block.type === 'finance_card') return `£${Number(block.data.totalSpend ?? 0).toFixed(0)} spent this week`;
    if (block.type === 'calendar_preview') return 'Week preview';
    if (block.type === 'job_card') return String(block.data.title || block.data.role || '');
  }
  return 'New message';
}

export function ThreadsScreen({ latestMessages, unreads, pins, onOpenThread, onTogglePin }: Props) {
  const [bgCollapsed, setBgCollapsed] = useState(false);
  const [longPressId, setLongPressId] = useState<string | null>(null);

  const mainTasks = TASKS.filter(t => t.tier === 'main');
  const bgTasks = TASKS.filter(t => t.tier === 'background');

  // Sort: pinned first, then by latest message time
  const sortByRecency = (tasks: TaskMeta[]) => {
    return [...tasks].sort((a, b) => {
      const aPinned = pins.includes(a.id);
      const bPinned = pins.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const timeA = latestMessages[a.id]
        ? new Date(latestMessages[a.id].timestamp).getTime()
        : 0;
      const timeB = latestMessages[b.id]
        ? new Date(latestMessages[b.id].timestamp).getTime()
        : 0;
      return timeB - timeA;
    });
  };

  const sortedMain = sortByRecency(mainTasks);
  const sortedBg = sortByRecency(bgTasks);
  const totalUnread = Object.values(unreads).reduce((a, b) => a + b, 0);
  const bgUnread = bgTasks.reduce((sum, t) => sum + (unreads[t.id] || 0), 0);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 sticky top-0 z-10 bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900">Threads</h1>
          {totalUnread > 0 && (
            <span className="text-xs text-gray-400">{totalUnread} unread</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Main tasks */}
        {sortedMain.map(task => (
          <ThreadRow
            key={task.id}
            task={task}
            latest={latestMessages[task.id]}
            unread={unreads[task.id] || 0}
            pinned={pins.includes(task.id)}
            showMenu={longPressId === task.id}
            onTap={() => onOpenThread(task)}
            onLongPress={() => setLongPressId(longPressId === task.id ? null : task.id)}
            onPin={() => { onTogglePin(task.id); setLongPressId(null); }}
            onDismissMenu={() => setLongPressId(null)}
          />
        ))}

        {/* Background section */}
        <button
          onClick={() => setBgCollapsed(!bgCollapsed)}
          className="w-full flex items-center justify-between px-5 py-2.5 bg-gray-50 border-y border-gray-100"
        >
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">
              Background
            </span>
            {bgUnread > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center">
                {bgUnread}
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${bgCollapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {!bgCollapsed && sortedBg.map(task => (
          <ThreadRow
            key={task.id}
            task={task}
            latest={latestMessages[task.id]}
            unread={unreads[task.id] || 0}
            pinned={pins.includes(task.id)}
            showMenu={longPressId === task.id}
            onTap={() => onOpenThread(task)}
            onLongPress={() => setLongPressId(longPressId === task.id ? null : task.id)}
            onPin={() => { onTogglePin(task.id); setLongPressId(null); }}
            onDismissMenu={() => setLongPressId(null)}
          />
        ))}
      </div>
    </div>
  );
}

function ThreadRow({ task, latest, unread, pinned, showMenu, onTap, onLongPress, onPin, onDismissMenu }: {
  task: TaskMeta;
  latest?: LatestMessage;
  unread: number;
  pinned: boolean;
  showMenu: boolean;
  onTap: () => void;
  onLongPress: () => void;
  onPin: () => void;
  onDismissMenu: () => void;
}) {
  const groupColor = GROUP_COLORS[task.group] || '#9CA3AF';
  const preview = latest ? getMessagePreview(latest.blocks) : 'No messages yet';
  const time = latest ? getRelativeTime(latest.timestamp) : '';

  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  const handleTouchStart = () => {
    longPressTimer = setTimeout(onLongPress, 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
  };

  return (
    <div className="relative">
      <button
        onClick={showMenu ? onDismissMenu : onTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}
        className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 active:bg-gray-50 transition-colors text-left"
      >
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 relative"
          style={{ backgroundColor: `${groupColor}12` }}
        >
          <span role="img" aria-label={task.name}>{task.icon}</span>
          <div
            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
            style={{ backgroundColor: groupColor }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {pinned && <span className="text-[11px] text-blue-500">&#x1F4CC;</span>}
              <span className={`text-[15px] truncate ${unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                {task.name}
              </span>
            </div>
            <span className={`text-[12px] shrink-0 ${unread > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              {time}
            </span>
          </div>
          <p className={`text-[13px] mt-0.5 truncate leading-snug ${unread > 0 ? 'text-gray-600' : 'text-gray-400'}`}>
            {preview}
          </p>
        </div>

        {/* Unread dot */}
        {unread > 0 && (
          <div className="shrink-0 pt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block" />
          </div>
        )}
      </button>

      {/* Long-press context menu */}
      {showMenu && (
        <div className="absolute right-4 top-2 z-20 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <button
            onClick={onPin}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
          >
            {pinned ? 'Unpin' : 'Pin to top'}
          </button>
        </div>
      )}
    </div>
  );
}
