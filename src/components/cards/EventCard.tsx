'use client';

import { useState } from 'react';

type EventCategory =
  | 'restaurant'
  | 'gig'
  | 'exhibition'
  | 'market'
  | 'cinema'
  | 'opening'
  | 'immersive'
  | 'musical'
  | 'pub'
  | 'nightlife';

// Returns true if the date string represents a specific, calendar-able event time
function hasSpecificDate(date: string): boolean {
  if (!date) return false;
  // These prefixes mean it's a range/opening/closing — not a bookable event slot
  const vaguePatterns = [
    /^from\b/i,
    /^opens?\b/i,
    /^closes?\b/i,
    /\bopen\s+now\b/i,
    /\bjust\s+on\s+sale\b/i,
    /\bmid-[a-z]+\b/i,
    /^launching\b/i,
  ];
  for (const p of vaguePatterns) {
    if (p.test(date)) return false;
  }
  // Specific day patterns
  const specificPatterns = [
    /\b(mon|tue|wed|thu|fri|sat|sun)(day)?\b/i,
    /\btonight\b/i,
    /\btomorrow\b/i,
    /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i,
  ];
  return specificPatterns.some(p => p.test(date));
}

function getUrgency(date: string, tags: string[]): 'high' | 'medium' | null {
  const tagStr = tags.join(' ').toLowerCase();
  if (/this\s+sunday/i.test(date) || tagStr.includes('urgent')) return 'high';
  if (/\bcloses?\b/i.test(date) || tagStr.includes('closing soon') || tagStr.includes('closing')) return 'medium';
  return null;
}

function buildCalendarUrl(title: string, venue: string): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    location: venue,
    details: 'Added from TaskPilot',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function categoryBadgeClass(category?: EventCategory): string {
  switch (category) {
    case 'restaurant': return 'bg-orange-50 text-orange-700';
    case 'gig':
    case 'nightlife': return 'bg-purple-50 text-purple-700';
    case 'exhibition':
    case 'immersive': return 'bg-blue-50 text-blue-700';
    case 'market': return 'bg-green-50 text-green-700';
    case 'cinema': return 'bg-slate-100 text-slate-600';
    case 'musical': return 'bg-pink-50 text-pink-700';
    case 'pub':
    case 'opening': return 'bg-amber-50 text-amber-700';
    default: return 'bg-amber-50 text-amber-700';
  }
}

// Map pin SVG
function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function EventCard({ data }: { data: Record<string, unknown> }) {
  const [saved, setSaved] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);

  const title = String(data.title || '');
  const venue = String(data.venue || '');
  const date = String(data.date || '');
  const time = data.time ? String(data.time) : null;
  const price = data.price ? String(data.price) : null;
  const reason = data.reason ? String(data.reason) : null;
  const tags = (data.tags as string[]) || [];
  const url = data.url ? String(data.url) : null;
  const inCalendar = Boolean(data.in_calendar);
  const imageUrl = data.image_url ? String(data.image_url) : null;
  const category = data.category as EventCategory | undefined;
  const mapUrl = data.map_url ? String(data.map_url) : null;
  const bookingUrl = data.booking_url ? String(data.booking_url) : null;

  const isOnCalendar = inCalendar || calendarAdded;
  const showAddToCalendar = !isOnCalendar && hasSpecificDate(date);
  const urgency = getUrgency(date, tags);
  const calendarUrl = buildCalendarUrl(title, venue);

  // Filter out urgency/closing tags that get their own badge
  const displayTags = tags
    .filter(t => !['closing', 'closing soon', 'urgent', 'confirmed'].includes(t.toLowerCase()))
    .slice(0, 4);

  if (saved) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Optional image banner */}
      {imageUrl && (
        <div className="w-full h-28 overflow-hidden">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-3.5 py-3">
        {/* Top row: category + urgency tags on left, "on calendar" badge on right */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex gap-1 flex-wrap min-w-0">
            {category && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${categoryBadgeClass(category)}`}>
                {category}
              </span>
            )}
            {urgency === 'high' && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700">
                Closing soon
              </span>
            )}
            {urgency === 'medium' && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                Closing soon
              </span>
            )}
            {displayTags.map(tag => (
              <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {tag}
              </span>
            ))}
          </div>
          {isOnCalendar && (
            <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
              ✓ On calendar
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-[14px] font-semibold text-gray-900 leading-snug">{title}</p>

        {/* Venue — with map pin link if map_url available */}
        <div className="mt-0.5">
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-[12px] text-gray-500 hover:text-blue-600 transition-colors"
            >
              <MapPinIcon className="w-3 h-3 shrink-0" />
              {venue}
            </a>
          ) : (
            <p className="text-[12px] text-gray-500">{venue}</p>
          )}
        </div>

        {/* Date / time / price */}
        {(date || time || price) && (
          <p className="text-[12px] text-gray-500 mt-0.5">
            {date}{time ? ` · ${time}` : ''}{price ? ` · ${price}` : ''}
          </p>
        )}

        {/* Reason */}
        {reason && (
          <p className="text-[11px] text-blue-600 mt-1.5 italic leading-snug">{reason}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-2.5">
          {/* Add to Calendar — only when specific date, opens Google Calendar */}
          {showAddToCalendar && (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setCalendarAdded(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {date}{time ? `, ${time}` : ''}
            </a>
          )}

          {/* Booking link — for immersive, exhibitions, gigs */}
          {bookingUrl && !isOnCalendar && (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              Book tickets
            </a>
          )}

          {/* Spacer pushes icon buttons to the right */}
          <div className="flex-1" />

          {/* Save for later (bookmark) — replaces Dismiss */}
          <button
            onClick={() => setSaved(true)}
            className="p-1.5 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 transition-colors"
            title="Save for later"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>

          {/* External link */}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              title="Open link"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
