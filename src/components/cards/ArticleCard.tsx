'use client';

import { useState } from 'react';

// Extract the real destination URL from a click-tracker redirect
function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    const inner = u.searchParams.get('url');
    if (inner) {
      return new URL(inner).hostname.replace(/^www\./, '');
    }
    return u.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function getFaviconUrl(url: string): string {
  const domain = extractDomain(url);
  if (!domain) return '';
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function topicColor(topic: string): string {
  const colors: Record<string, string> = {
    'tech-ai': '#6366f1',
    'tech': '#3b82f6',    'culture': '#ec4899',
    'food': '#f59e0b',
    'travel': '#10b981',
    'science': '#06b6d4',
    'design': '#8b5cf6',
    'finance': '#059669',
    'music': '#e11d48',
    'sport': '#ea580c',
    'london': '#dc2626',
    'news': '#64748b',
  };
  const key = Object.keys(colors).find(k => topic.toLowerCase().includes(k));
  return key ? colors[key] : '#94a3b8';
}

// Simple hash to generate a stable ID from a URL
function hashId(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return `saved-article-${Math.abs(hash).toString(36)}`;
}

export function ArticleCard({ data }: { data: Record<string, unknown> }) {
  const [reaction, setReaction] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const title = String(data.title || '');
  const source = String(data.source || '');
  const topic = String(data.topic || '');
  const topicEmoji = String(data.topicEmoji || '');
  const summary = String(data.summary || '');
  const url = data.url ? String(data.url) : '#';
  const isDiscovery = Boolean(data.isDiscovery);
  const readingTime = Number(data.readingTimeMinutes || 0);

  const favicon = getFaviconUrl(url);
  const accent = topicColor(topic);
  const itemId = hashId(url);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (saved) {
        // Unsave
        const res = await fetch(`/api/saved/${itemId}`, { method: 'DELETE' });
        if (res.ok) setSaved(false);
      } else {
        // Save
        const res = await fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: itemId,
            title,            url,
            category: topic,
            tags: [source, isDiscovery ? 'discovery' : null, topicEmoji].filter(Boolean),
            reason: summary,
            source_task_id: 'smart-reading-digest',
          }),
        });
        if (res.ok || res.status === 201) setSaved(true);
      }
    } catch (err) {
      console.error('Save/unsave failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReaction = async (type: 'up' | 'down') => {
    const newReaction = reaction === type ? null : type;
    setReaction(newReaction);
    // Fire-and-forget feedback to profile evidence
    try {
      await fetch('/api/profile/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: 'smart-reading-digest',
          type: 'article_feedback',
          detail: `${type === 'up' ? 'Liked' : 'Disliked'}: "${title}" (${source}, ${topic})`,
        }),
      });    } catch {
      // non-critical
    }
  };

  return (
    <div className={`rounded-xl shadow-sm border overflow-hidden ${
      isDiscovery ? 'bg-violet-50 border-violet-200' : 'bg-white border-gray-100'
    }`}>
      {/* Accent bar */}
      <div className="h-1" style={{ backgroundColor: accent }} />

      <div className="px-3.5 py-3">
        {/* Source row with favicon */}
        <div className="flex items-center gap-2 mb-2">
          {favicon && !faviconError && (
            <img
              src={favicon}
              alt=""
              width={16}
              height={16}
              className="rounded-sm shrink-0"
              onError={() => setFaviconError(true)}
            />
          )}
          <span className="text-[11px] font-medium text-gray-600">{source}</span>
          <div className="flex items-center gap-1.5 ml-auto text-[11px] text-gray-400">
            {isDiscovery && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">                Discovery
              </span>
            )}
            <span>{topicEmoji} {topic}</span>
            {readingTime > 0 && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {readingTime} min
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <a href={url} target="_blank" rel="noopener noreferrer" className="block group">
          <h3 className="text-[14px] font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug">
            {title}
          </h3>
        </a>

        {/* Summary */}
        {summary && (
          <p className="text-[12px] text-gray-500 mt-1.5 leading-relaxed">
            {summary}
          </p>
        )}
        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-100">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Read full article on ${source}`}
            className="px-3 py-1 text-[11px] font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            Read
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            title={saved ? 'Remove from saved items' : 'Save for later'}
            className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors disabled:opacity-50 ${
              saved
                ? 'border border-blue-200 bg-blue-50 text-blue-600'
                : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {saved ? 'Saved' : 'Save'}
          </button>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => handleReaction('up')}
              title="More like this — improves future recommendations"
              className={`w-7 h-7 flex items-center justify-center text-[13px] rounded-md transition-colors ${                reaction === 'up' ? 'bg-green-50 border border-green-200' : 'border border-gray-200 hover:bg-gray-50'
              }`}
            >
              &#x1F44D;
            </button>
            <button
              onClick={() => handleReaction('down')}
              title="Less like this — improves future recommendations"
              className={`w-7 h-7 flex items-center justify-center text-[13px] rounded-md transition-colors ${
                reaction === 'down' ? 'bg-red-50 border border-red-200' : 'border border-gray-200 hover:bg-gray-50'
              }`}
            >
              &#x1F44E;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
