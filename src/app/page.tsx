'use client';

import { useState, useEffect } from 'react';
import { BriefScreen } from '@/components/BriefScreen';
import { CalendarScreen } from '@/components/CalendarScreen';
import { ReadingScreen } from '@/components/ReadingScreen';
import { ProfileScreen } from '@/components/ProfileScreen';

type Tab = 'brief' | 'calendar' | 'reading' | 'profile';

// Kept for ThreadsScreen compatibility (historical component)
export interface LatestMessage {
  id: string;
  task_id: string;
  blocks: unknown[];
  timestamp: string;
  is_from_user: boolean;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('brief');

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
      // Reading tab handles thread deep links now
      setTab('reading');
    }
  }, []);

  const tabItems = [
    { id: 'brief' as Tab,    label: 'Brief',    icon: <BriefIcon /> },
    { id: 'calendar' as Tab, label: 'Calendar', icon: <CalendarIcon /> },
    { id: 'reading' as Tab,  label: 'Reading',  icon: <ReadingIcon /> },
    { id: 'profile' as Tab,  label: 'Profile',  icon: <ProfileIcon /> },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* ── Desktop sidebar nav (lg+) ── */}
      <nav className="hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0 border-r bg-gray-50/80 pt-6 pb-4 px-3">
        <h1 className="text-lg font-bold text-gray-900 px-3 mb-6">TaskPilot</h1>
        {tabItems.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto">
          {tab === 'brief'    && <BriefScreen />}
          {tab === 'calendar' && <CalendarScreen />}
          {tab === 'reading'  && <ReadingScreen />}
          {tab === 'profile'  && <ProfileScreen />}
        </div>

        {/* ── Mobile tab bar (< lg) ── */}
        <nav className="flex lg:hidden items-center justify-around border-t bg-white/95 backdrop-blur-lg px-2 pb-5 pt-2 shrink-0">
          {tabItems.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 ${
                tab === t.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              {t.icon}
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────

function BriefIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
  );
}

function ReadingIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
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
