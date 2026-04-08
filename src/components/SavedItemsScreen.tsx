'use client';

import { useSavedItems, type SavedItem } from '@/lib/SavedItemsContext';

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: '🍽️', gig: '🎵', music: '🎵', exhibition: '🎨',
  immersive: '🌀', market: '🛍️', cinema: '🎬', opening: '✨',
  pub: '🍺', theatre: '🎭', musical: '🎭', nightlife: '🌙', art: '🎨',
};

function getCategoryIcon(category?: string | null, tags?: string[]): string {
  if (category && CATEGORY_ICONS[category.toLowerCase()]) {
    return CATEGORY_ICONS[category.toLowerCase()];
  }
  if (tags) {
    for (const tag of tags) {
      const icon = CATEGORY_ICONS[tag.toLowerCase()];
      if (icon) return icon;
    }
  }
  return '📍';
}

function getMapUrl(venue: string, mapUrl?: string | null): string {
  if (mapUrl) return mapUrl;
  return `https://www.google.com/maps/search/${encodeURIComponent(venue)}`;
}

function formatSavedDate(isoDate: string): string {
  const d = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function SavedItemCard({ item, onUnsave }: { item: SavedItem; onUnsave: (id: string) => void }) {
  const icon = getCategoryIcon(item.category, item.tags);
  const mapsLink = item.venue ? getMapUrl(item.venue, item.map_url) : null;
  const linkUrl = item.url || item.booking_url;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Image */}
      {item.image_url && (
        <div className="h-28 bg-gray-100">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <div className="px-3.5 py-3">
        {/* Tags row */}
        {item.tags.length > 0 && (
          <div className="flex gap-1 mb-1.5 flex-wrap">
            <span className="text-sm leading-none">{icon}</span>
            {item.tags.map(tag => (
              <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <p className="text-[14px] font-semibold text-gray-900 leading-snug">{item.title}</p>

        {/* Venue */}
        {item.venue && (
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
                {item.venue}
              </a>
            ) : (
              <p className="text-[12px] text-gray-500">{item.venue}</p>
            )}
          </div>
        )}

        {/* Date / time / price */}
        {(item.date || item.time || item.price) && (
          <p className="text-[12px] text-gray-500 mt-0.5">
            {item.date}{item.time ? ` · ${item.time}` : ''}{item.price ? ` · ${item.price}` : ''}
          </p>
        )}

        {/* Reason */}
        {item.reason && (
          <p className="text-[11px] text-blue-600 mt-1.5 italic leading-snug">{item.reason}</p>
        )}

        {/* Saved date */}
        <p className="text-[10px] text-gray-400 mt-1.5">Saved {formatSavedDate(item.saved_at)}</p>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-2.5">
          {/* Open in Google Maps */}
          {mapsLink && (
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Open in Maps
            </a>
          )}

          {/* External link */}
          {linkUrl && (
            <a
              href={linkUrl}
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

          {/* Unsave */}
          <button
            onClick={() => onUnsave(item.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ml-auto"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export function SavedItemsScreen() {
  const { items, unsaveItem, loading } = useSavedItems();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading saved items...</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Saved Places</h1>
        <span className="text-[12px] text-gray-400 font-medium">{items.length} saved</span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📍</div>
          <p className="text-gray-500 text-sm font-medium">No saved places yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Tap Save on any event card to add it here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <SavedItemCard key={item.id} item={item} onUnsave={unsaveItem} />
          ))}
        </div>
      )}
    </div>
  );
}
