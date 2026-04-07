'use client';

import { useState } from 'react';

interface EventData {
  title?: string;
  venue?: string;
  date?: string;
  time?: string;
  price?: string;
  reason?: string;
  tags?: string[];
  url?: string;
  in_calendar?: boolean;
  image_url?: string;
  category?: string;
  map_url?: string;
  booking_url?: string;
}

// Determine if the date string represents a specific bookable date
function hasSpecificDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const lower = dateStr.toLowerCase();
  // Vague dates — don't show "Add to Calendar"
  const vague = [
    'just on sale', 'on sale', 'opens mid', 'open now',
    'coming soon', 'tba', 'tbd', 'date tbc',
  ];
  if (vague.some(v => lower.includes(v))) return false;
  // Specific patterns — show "Add to Calendar"
  const specific = [
    /\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    /tonight/i, /today/i, /tomorrow/i,
    /(mon|tue|wed|thu|fri|sat|sun)\w*\s+\d/i,
    /from\s+\d/i,
  ];
  return specific.some(p => p.test(lower));
}

// Determine if date indicates urgency (closing soon)
function isClosingSoon(dateStr: string): boolean {
  if (!dateStr) return false;
  const lower = dateStr.toLowerCase();
  return lower.includes('closes') || lower.includes('closing') ||
         lower.includes('last') || lower.includes('final');
}


function getMapUrl(venue: string, mapUrl?: string): string {
  if (mapUrl) return mapUrl;
  return `https://www.google.com/maps/search/${encodeURIComponent(venue)}`;
}
export function EventCard({ data }: { data: Record<string, unknown> }) {
  const [saved, setSaved] = useState(false);
  const [calAdded, setCalAdded] = useState(false);

  const d = data as unknown as EventData;
  const title = d.title || '';
  const venue = d.venue || '';
  const date = d.date || '';
  const time = d.time || null;
  const price = d.price || null;
  const reason = d.reason || null;
  const tags = d.tags || [];
  const url = d.url || d.booking_url || null;
  const inCalendar = Boolean(d.in_calendar);
  const imageUrl = d.image_url || null;
  const mapUrl = d.map_url || null;

  const canAddToCalendar = hasSpecificDate(date) && !inCalendar;
  const closing = isClosingSoon(date);
  const mapsLink = venue ? getMapUrl(venue, mapUrl || undefined) : null;
  return (
    <div className={`rounded-2xl shadow-sm border overflow-hidden ${
      closing ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100 bg-white'
    }`}>
      {/* Image banner */}
      {imageUrl && (
        <div className="relative h-32 bg-gray-100">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {inCalendar && (
            <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500 text-white shadow-sm">
              ✓ On calendar
            </span>
          )}
        </div>
      )}

      <div className="px-3.5 py-3">
        {/* Top row: category icon + tags + calendar badge (if no image) */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {tags.length > 0 && (
              <div className="flex gap-1 mb-1.5 flex-wrap">
                {tags.map(tag => (
                  <span key={tag} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    tag.toLowerCase().includes('urgent') || tag.toLowerCase().includes('closing')
                      ? 'bg-red-50 text-red-700'
                      : tag.toLowerCase().includes('new')
                      ? 'bg-violet-50 text-violet-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {/* Title */}
            <p className="text-[14px] font-semibold text-gray-900 leading-snug">{title}</p>

            {/* Venue with map link */}
            {venue && (
              <div className="flex items-center gap-1 mt-0.5">
                {mapsLink ? (
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-gray-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {venue}
                  </a>
                ) : (
                  <p className="text-[12px] text-gray-500">{venue}</p>
                )}
              </div>
            )}
            {/* Date / time / price row */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className={`text-[12px] ${closing ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                {date}{time ? ` · ${time}` : ''}{price ? ` · ${price}` : ''}
              </p>
            </div>

            {/* Reason / recommendation */}
            {reason && (
              <p className="text-[11px] text-blue-600 mt-1.5 italic leading-snug">{reason}</p>
            )}
          </div>

          {/* Calendar badge (when no image) */}
          {!imageUrl && inCalendar && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 whitespace-nowrap shrink-0 mt-0.5">
              ✓ On calendar
            </span>
          )}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-2.5">
          {/* Add to Calendar — only when there's a specific date */}
          {canAddToCalendar && !calAdded && (
            <button
              onClick={() => setCalAdded(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {date}{time ? ` · ${time}` : ''}
            </button>
          )}
          {calAdded && (
            <span className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-green-700 bg-green-50 rounded-lg border border-green-200">
              ✓ Added to calendar
            </span>
          )}

          {/* Save for later */}
          <button
            onClick={() => setSaved(!saved)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
              saved
                ? 'text-blue-700 bg-blue-100'
                : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {saved ? 'Saved' : 'Save'}
          </button>
          {/* External link */}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Link
            </a>
          )}

          {/* Map link (icon only, when no venue link already shown) */}
          {mapsLink && !venue && (
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-2 py-1.5 text-[12px] text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
