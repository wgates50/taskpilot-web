'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { TopBar } from '@/components/shell/TopBar';
import { TabBar } from '@/components/shell/TabBar';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { TweaksPanel } from '@/components/shell/TweaksPanel';
import { TABS, type TabId } from '@/components/shell/tabs';
import { BriefScreen } from '@/components/BriefScreen';
import { CalendarScreen } from '@/components/CalendarScreen';
import { ReadingScreen } from '@/components/ReadingScreen';
import { ProfileScreen } from '@/components/ProfileScreen';
import { ComingSoon } from '@/components/ComingSoon';

// Kept for historical ThreadsScreen compatibility
export interface LatestMessage {
  id: string;
  task_id: string;
  blocks: unknown[];
  timestamp: string;
  is_from_user: boolean;
}

export default function Home() {
  const [tab, setTab] = useState<TabId>('brief');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  // Service worker + push
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
    });
  }, []);

  // Deep-link from push notification → Reading
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (params.get('thread')) setTab('reading');
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K → palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((x) => !x);
        return;
      }
      // Ignore tab shortcuts if typing
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // 1-6 → tabs
      const idx = ['1', '2', '3', '4', '5', '6'].indexOf(e.key);
      if (idx >= 0) {
        const t = TABS[idx];
        if (t) setTab(t.id);
        return;
      }
      // ","  → tweaks
      if (e.key === ',') setTweaksOpen((x) => !x);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const currentTab = TABS.find((t) => t.id === tab)!;
  const meta = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="tp-app">
      <Sidebar
        current={tab}
        onSelect={setTab}
        onOpenTweaks={() => setTweaksOpen(true)}
        userName="Will"
        userEmail="wgates50@gmail.com"
      />
      <main className="tp-main">
        <TopBar
          title={currentTab.label}
          meta={meta}
          onOpenCommandPalette={() => setCmdOpen(true)}
        />
        <div className="tp-body scroll">
          {tab === 'brief'    && <BriefScreen />}
          {tab === 'calendar' && <CalendarScreen />}
          {tab === 'fitness'  && (
            <ComingSoon
              title="Fitness"
              blurb="Gain / Lean / Maintain modes, Whoop recovery, Apple Health rings and a plan editor are landing in Wave 3."
              icon="activity"
            />
          )}
          {tab === 'unesco'   && (
            <ComingSoon
              title="UNESCO"
              blurb="A world-map tracker for every UNESCO site I've visited, with country filter and nearest-from-London sort — ships in Wave 2."
              icon="globe"
            />
          )}
          {tab === 'reading'  && <ReadingScreen />}
          {tab === 'settings' && <ProfileScreen />}
        </div>
        <TabBar current={tab} onSelect={setTab} />
      </main>

      {tweaksOpen && <TweaksPanel onClose={() => setTweaksOpen(false)} />}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onSelectTab={(t) => setTab(t)}
      />
    </div>
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
