'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThreadsScreen } from '@/components/ThreadsScreen';
import { ThreadDetail } from '@/components/ThreadDetail';
import { DashboardScreen } from '@/components/DashboardScreen';
import { ProfileScreen } from '@/components/ProfileScreen';
import { SavedItemsScreen } from '@/components/SavedItemsScreen';
import { SavedItemsProvider } from '@/lib/SavedItemsContext';
import { TASKS, type TaskMeta } from '@/lib/tasks';

type Tab = 'threads' | 'saved' | 'dashboard' | 'profile';

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
      <SavedItemsProvider>
        <ThreadDetail
          task={selectedTask}
          onBack={() => {
            setSelectedTask(null);
            fetchLatest();
          }}
        />
      </SavedItemsProvider>
    );
  }

  return (
    <SavedItemsProvider>
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
          {tab === 'saved' && <SavedItemsScreen />}
          {tab === 'dashboard' && <DashboardScreen />}
          {tab === 'profile' && <ProfileScreen />}
        </div>

        {/* Tab bar */}
        <nav className="flex items-center justify-around border-t bg-white/95 backdrop-blur-lg px-2 pb-5 pt-2 shrink-0">
          {[
            { id: 'threads' as Tab, label: 'Threads', icon: <ThreadsIcon />, badge: totalUnread },
            { id: 'saved' as Tab, label: 'Saved', icon: <SavedIcon /> },
            { id: 'dashboard' as Tab, label: 'Dashboard', icon: <DashboardIcon /> },
            { id: 'profile' as Tab, label: 'Profile', icon: <ProfileIcon /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 relative ${
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
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </SavedItemsProvider>
  );
}

function ThreadsIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function SavedIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
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
