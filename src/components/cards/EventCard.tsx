'use client';

import { useState } from 'react';

export function EventCard({ data }: { data: Record<string, unknown> }) {
  const [status, setStatus] = useState<'idle' | 'added' | 'dismissed'>('idle');

  const title = String(data.title || '');
  const venue = String(data.venue || '');
  const date = String(data.date || '');
  const time = data.time ? String(data.time) : null;
  const price = data.price ? String(data.price) : null;
  const reason = data.reason ? String(data.reason) : null;
  const tags = (data.tags as string[]) || [];
  const url = data.url ? String(data.url) : null;
  const inCalendar = Boolean(data.in_calendar);

  if (status === 'added') {
    return (
      <div className="bg-green-50 rounded-2xl px-3.5 py-3 shadow-sm border border-green-200">
        <p className="text-[13px] text-green-700 font-medium">Added to calendar</p>
      </div>
    );
  }
  if (status === 'dismissed') return null;

  return (
    <div className="bg-white rounded-2xl px-3.5 py-3 shadow-sm border border-gray-100">
      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex gap-1 mb-1.5 flex-wrap">
          {tags.map(tag => (
            <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
              {tag}
            </span>
          ))}
        </div>
      )}

      <p className="text-[14px] font-semibold text-gray-900">{title}</p>
      <p className="text-[12px] text-gray-500 mt-0.5">{venue}</p>
      <p className="text-[12px] text-gray-500">{date}{time ? ` \u00B7 ${time}` : ''}{price ? ` \u00B7 ${price}` : ''}</p>

      {reason && (
        <p className="text-[11px] text-blue-600 mt-1.5 italic">{reason}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-2.5">
        {inCalendar ? (
          <span className="flex-1 py-1.5 text-[12px] font-medium text-green-700 bg-green-50 rounded-lg text-center border border-green-200">
            ✓ On your calendar
          </span>
        ) : (
          <button
            onClick={() => setStatus('added')}
            className="flex-1 py-1.5 text-[12px] font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Add to Calendar
          </button>
        )}
        <button
          onClick={() => setStatus('dismissed')}
          className="px-3 py-1.5 text-[12px] font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Dismiss
        </button>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-[12px] font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            Link
          </a>
        )}
      </div>
    </div>
  );
}
