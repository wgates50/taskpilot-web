'use client';

import { useState } from 'react';
import { useSavedItems } from '@/lib/SavedItemsContext';

export function ArticleCard({ data }: { data: Record<string, unknown> }) {
  const { isSaved, getSavedId, saveItem, unsaveItem } = useSavedItems();
  const [reaction, setReaction] = useState<'up' | 'down' | null>(null);
  const [busy, setBusy] = useState(false);

  const title = String(data.title || '');
  const source = String(data.source || '');
  const topic = String(data.topic || '');
  const topicEmoji = String(data.topicEmoji || '');
  const summary = String(data.summary || '');
  const url = data.url ? String(data.url) : '#';
  const isDiscovery = Boolean(data.isDiscovery);
  const readingTime = Number(data.readingTimeMinutes || 0);

  const saved = isSaved(title, source || undefined);
  const savedId = getSavedId(title, source || undefined);

  const handleToggleSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (saved && savedId) {
        await unsaveItem(savedId);
      } else {
        await saveItem({
          title,
          venue: source || null,
          category: topic || null,
          tags: topic ? [topic] : [],
          url: url !== '#' ? url : null,
          reason: summary || null,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  // Persist a thumbs-up/down to the evidence log so the taste profile can
  // learn from it. Best-effort — failures don't block the UI.
  const sendReaction = async (kind: 'up' | 'down') => {
    setReaction(kind);
    try {
      await fetch('/api/profile/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'reading',
          type: kind === 'up' ? 'positive_signal' : 'negative_signal',
          detail: { article: title, source, topic, url },
        }),
      });
    } catch (e) {
      console.error('Failed to log reaction:', e);
    }
  };

  return (
    <div className={`rounded-2xl px-3.5 py-3 shadow-sm border ${
      isDiscovery ? 'bg-violet-50 border-violet-200' : 'bg-white border-gray-100'
    }`}>
      {/* Meta row */}
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">
        {isDiscovery && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
            Discovery
          </span>
        )}
        <span>{topicEmoji} {topic}</span>
        <span>&middot;</span>
        <span>{source}</span>
        {readingTime > 0 && <><span>&middot;</span><span>{readingTime} min</span></>}
      </div>

      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <p className="text-[14px] font-semibold text-gray-900 hover:text-blue-700">{title}</p>
      </a>
      {summary && (
        <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{summary}</p>
      )}

      {/* Actions */}
      <div className="flex gap-1.5 mt-2.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-[12px] font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Read
        </a>
        <button
          onClick={handleToggleSave}
          disabled={busy}
          className={`px-3 py-1.5 text-[12px] font-medium rounded-lg disabled:opacity-50 ${
            saved ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {saved ? 'Saved' : 'Save'}
        </button>
        <button
          onClick={() => sendReaction('up')}
          className={`px-2 py-1.5 text-[14px] rounded-lg ${
            reaction === 'up' ? 'bg-green-100' : 'bg-gray-100 hover:bg-gray-200'
          }`}
          aria-label="Thumbs up"
        >
          &#x1F44D;
        </button>
        <button
          onClick={() => sendReaction('down')}
          className={`px-2 py-1.5 text-[14px] rounded-lg ${
            reaction === 'down' ? 'bg-red-100' : 'bg-gray-100 hover:bg-gray-200'
          }`}
          aria-label="Thumbs down"
        >
          &#x1F44E;
        </button>
      </div>
    </div>
  );
}
