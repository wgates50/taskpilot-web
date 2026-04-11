'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThreadsScreen } from '@/components/ThreadsScreen';
import { ThreadDetail } from '@/components/ThreadDetail';
import { CalendarScreen } from '@/components/CalendarScreen';
import { DashboardScreen } from '@/components/DashboardScreen';
import { ProfileScreen } from '@/components/ProfileScreen';
import { UnescoTracker } from '@/components/UnescoTracker';
import { TASKS, type TaskMeta } from '@/lib/tasks';

type Tab = 'threads' | 'calendar' | 'dashboard' | 'profile' | 'heritage';

export interface LatestMessage {
  id: string;
  task_id: string;
  blocks: unknown[];
  timestamp: string;
  is_from_user: boolean;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('threads');
  const [selectedTask, setSelectedTask] = useState<TaskMeta | null>(null);
  const [latestMessages, setLatestMessages] = useState<Record<string, LatestMessage>>({});
  const [unreads, setUnreads] = useState<Record<string, number>>({});
  const [pins, setPins] = useState<string[]>([]);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/latest');
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, LatestMessage> = {};
        for (const msg of data.latest) {
          map[msg.task_id] = msg;
        }
        setLatestMessages(map);
        setUnreads(data.unreads || {});
      }
    } catch (e) {
      console.error('Failed to fetch latest:', e);
    }
  }, []);

  const fetchPins = useCallback(async () => {
    try {
      const res = await fetch('/api/pins');
      if (res.ok) {
        const data = await res.json();
        setPins(data.pins || []);
      }
    } catch (e) {
      console.error('Failed to fetch pins:', e);
    }
  }, []);

  useEffect(() => {
    fetchLatest();
    fetchPins();
    const interval = setInterval(fetchLatest, 30000);
    return () => clearInterval(interval);
  }, [fetchLatest, fetchPins]);

  // Register service worker + push
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(async (reg) => {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (vapidKey) {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
            });
            await fetch('/api/push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscription: sub.toJSON() }),
            });
          }
        }
      });
    }
  }, []);

  // Deep link from push notification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const threadId = params.get('thread');
    if (threadId) {
      const task = TASKS.find(t => t.id === threadId);
      if (task) setSelectedTask(task);
    }
  }, []);

  const togglePin = async (taskId: string) => {
    try {
      const res = await fetch('/api/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPins(prev =>
          data.pinned ? [...prev, taskId] : prev.filter(id => id !== taskId)
        );
      }
    } catch (e) {
      console.error('Failed to toggle pin:', e);
    }
  };

  const openThread = (task: TaskMeta) => {
    setSelectedTask(task);
    setUnreads(prev => ({ ...prev, [task.id]: 0 }));
  };

  const totalUnread = Object.values(unreads).reduce((a, b) => a + b, 0);

  if (selectedTask) {
    return (
      <ThreadDetail
        task={selectedTask}
        onBack={() => {
          setSelectedTask(null);
          fetchLatest();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {tab === 'threads' && (
          <ThreadsScreen
            latestMessages={latestMessages}
            unreads={unreads}
            pins={pins}
            onOpenThread={openThread}
            onTogglePin={togglePin}
          />
        )}
        {tab === 'calendar' && <CalendarScreen />}
        {tab === 'dashboard' && <DashboardScreen />}
        {tab === 'profile' && <ProfileScreen />}
        {tab === 'heritage' && <UnescoTracker />}
      </div>

      {/* Tab bar */}
      <nav className="flex items-center justify-around border-t bg-white/95 backdrop-blur-lg px-1 pb-5 pt-2 shrink-0">
        {[
          { id: 'threads' as Tab, label: 'Threads', icon: <ThreadsIcon />, badge: totalUnread },
          { id: 'calendar' as Tab, label: 'Calendar', icon: <PlanningIcon /> },
          { id: 'dashboard' as Tab, label: 'Dashboard', icon: <DashboardIcon /> },
          { id: 'heritage' as Tab, label: 'Heritage', icon: <UnescoIcon /> },
          { id: 'profile' as Tab, label: 'Profile', icon: <ProfileIcon /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 relative ${
              tab === t.id ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <div className="relative">
              {t.icon}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {t.badge > 9 ? '9+' : t.badge}
                </span>
              )}
            </div>
            <span className="text-[9px] font-medium">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function ThreadsIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function PlanningIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function UnescoIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
