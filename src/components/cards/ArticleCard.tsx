'use client';

import { useState } from 'react';

export function ArticleCard({ data }: { data: Record<string, unknown> }) {
  const [reaction, setReaction] = useState<string | null>(null);

  const title = String(data.title || '');
  const source = String(data.source || '');
  const topic = String(data.topic || '');
  const topicEmoji = String(data.topicEmoji || '');
  const summary = String(data.summary || '');
  const url = data.url ? String(data.url) : '#';
  const isDiscovery = Boolean(data.isDiscovery);
  const readingTime = Number(data.readingTimeMinutes || 0);

  return (
    <div className={`rounded-xl px-3.5 py-3 shadow-sm border ${
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
      <div className="flex items-center gap-2 mt-2.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 text-[11px] font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
        >
          Read
        </a>
        <button
          onClick={() => setReaction('saved')}
          className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
            reaction === 'saved'
              ? 'border border-blue-200 bg-blue-50 text-blue-600'
              : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          Save
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setReaction('up')}
            className={`w-7 h-7 flex items-center justify-center text-[13px] rounded-md transition-colors ${
              reaction === 'up' ? 'bg-green-50 border border-green-200' : 'border border-gray-200 hover:bg-gray-50'
            }`}
          >
            &#x1F44D;
          </button>
          <button
            onClick={() => setReaction('down')}
            className={`w-7 h-7 flex items-center justify-center text-[13px] rounded-md transition-colors ${
              reaction === 'down' ? 'bg-red-50 border border-red-200' : 'border border-gray-200 hover:bg-gray-50'
            }`}
          >
            &#x1F44E;
          </button>
        </div>
      </div>
    </div>
  );
}
