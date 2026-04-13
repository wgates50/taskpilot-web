'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ────────────────────────────────────────────────

interface Suggestion {
  id: number;
  place_id: string;
  suggestion_date: string;
  suggested_for: string | null;
  score: number;
  scoring_reasons: Record<string, number | string>;
  status: string;
  name: string;
  category: string;
  subcategory: string;
  area: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  google_maps_url: string | null;
  website: string | null;
  google_rating: number | null;
  vibe_tags: string[];
  time_tags: string[];
  weather_tags: string[];
  social_tags: string[];
  price_tier: string | null;
  booking_type: string | null;
  duration: string | null;
  notes: string | null;
  times_visited: number;
  liked: boolean;
  cuisine_tags: string[];
}

interface PlaceRecord {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  area: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  google_maps_url: string | null;
  website: string | null;
  google_rating: number | null;
  vibe_tags: string[];
  time_tags: string[];
  weather_tags: string[];
  social_tags: string[];
  cuisine_tags: string[];
  day_tags: string[];
  season_tags: string[];
  price_tier: string | null;
  booking_type: string | null;
  duration: string | null;
  notes: string | null;
  times_visited: number;
  times_suggested: number;
  times_dismissed: number;
  last_suggested: string | null;
  last_visited: string | null;
  liked: boolean;
}

interface CachedEvent {
  id: string;
  title: string;
  venue: string | null;
  date_start: string;
  date_end: string | null;
  category: string | null;
  price: string | null;
  url: string | null;
  calendar_link: string | null;
  tags: string[];
  reason: string | null;
  closing_date: string | null;
  score: number | null;
  status: string;
  lat: number | null;
  lng: number | null;
}

// Normalised anchor for proximity-based bonus picks. Can be sourced from
// either an accepted Suggestion or a gcal-synced CachedEvent with coords.
interface DayAnchor {
  id: string;            // the source row id (prefix "gcal-" if event-sourced)
  place_id: string | null;
  name: string;
  category: string | null;
  lat: number;
  lng: number;
  suggested_for: string | null;
  source: 'suggestion' | 'event';
}

interface VisitReview {
  id: number;
  place_id: string | null;
  event_id: string | null;
  review_week: string;
  status: string;
  place_name?: string;
  place_category?: string;
  place_area?: string;
}

interface UserContext {
  location?: { area: string; lat: number; lng: number };
  companions?: { mode: string; detail: string | null };
  working_week_mode?: boolean;
}

interface WeatherData {
  temp: number;
  weatherCode: number;
  isRainy: boolean;
  isSunny: boolean;
  isCold: boolean;
  isWarm: boolean;
}

// ── Constants ────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  // High-level taxonomy
  'Food & Drink': '🍽️',
  'Culture & Entertainment': '🎭',
  'Shopping & Markets': '🛍️',
  'Outdoors & Leisure': '🌳',
  'Wellness': '💆',
  // Notion source categories (lowercase from data sync)
  restaurant: '🍽️', restaurants: '🍽️',
  pub: '🍺', pubs: '🍺', bar: '🍸', bars: '🍸',
  cafe: '☕', cafes: '☕', coffee: '☕',
  bakery: '🥐', dessert: '🍰',
  // Culture & entertainment
  art: '🎨', theatre: '🎭', film: '🎬',
  music: '🎵', comedy: '🎤', history: '👑',
  museum: '🏛️', gallery: '🖼️', cinema: '🎬',
  // Shopping & markets
  markets: '🛍️', market: '🛍️', shop: '🛒', shopping: '🛍️',
  // Outdoors
  park: '🌳', garden: '🌷', walk: '🚶', outdoor: '🌳',
  // Other
  wellness: '💆', spa: '💆', fitness: '💪',
  'Uncategorised': '📍',
};

const BOOKING_LABELS: Record<string, { label: string; color: string }> = {
  'walk-in': { label: 'Walk-in', color: 'bg-green-100 text-green-700' },
  'booking-recommended': { label: 'Book ahead', color: 'bg-amber-100 text-amber-700' },
  'booking-required': { label: 'Booking required', color: 'bg-red-100 text-red-700' },
};

// Time-of-day buckets — order matters for render
const TIME_BUCKETS: { key: string; label: string; icon: string; matches: string[] }[] = [
  { key: 'morning',   label: 'Morning',   icon: '🌅', matches: ['morning', 'breakfast', 'brunch'] },
  { key: 'afternoon', label: 'Afternoon', icon: '☀️', matches: ['afternoon', 'lunch', 'daytime'] },
  { key: 'evening',   label: 'Evening',   icon: '🌙', matches: ['evening', 'dinner', 'night', 'late-night'] },
];

function bucketFor(suggestedFor: string | null): string {
  if (!suggestedFor) return 'evening';
  const s = suggestedFor.toLowerCase();
  for (const b of TIME_BUCKETS) {
    if (b.matches.some(m => s.includes(m))) return b.key;
  }
  return 'evening';
}

function titleCase(s: string): string {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const COMPANION_OPTIONS = [
  { mode: 'solo', label: 'Solo', icon: '👤' },
  { mode: 'partner', label: 'Partner', icon: '💑' },
  { mode: 'friends', label: 'Friends', icon: '👥' },
  { mode: 'family', label: 'Family', icon: '👨‍👩‍👧' },
];

// WMO weather codes → readable conditions
const WEATHER_SUNNY = new Set([0, 1]); // clear, mainly clear
const WEATHER_RAINY = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99]);

// ── Scoring weights (mirrors the daily-activity-engine) ──

const WEIGHTS = {
  interest: 0.30,
  weather: 0.20,
  time: 0.15,
  location: 0.10,
  social: 0.10,
  novelty: 0.10,
  season: 0.05,
};

// ── Helpers ──────────────────────────────────────────────

function getWeekDates(offset: number = 0): { dates: Date[]; label: string } {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }

  const sun = dates[6];
  const monthFmt = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' });
  const label = `${monday.getDate()} ${monthFmt(monday)} – ${sun.getDate()} ${monthFmt(sun)}`;
  return { dates, label };
}

function formatDate(d: Date): string {
  // Use LOCAL calendar date, not UTC. toISOString() returns UTC and will
  // shift every column by one day in any timezone ahead of UTC (e.g. BST),
  // causing "Today" queries to hit yesterday's rows in the suggestions table.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDayLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-GB', { weekday: 'long' });
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns true if working week mode should suppress suggestions for this date.
// Suppresses today only, and only before 17:00 on Mon–Fri.
// Future weekdays always show (you're planning ahead).
function isWorkingHoursSuppressed(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateNormalised = new Date(date);
  dateNormalised.setHours(0, 0, 0, 0);
  if (dateNormalised.getTime() !== today.getTime()) return false; // not today
  const dow = today.getDay(); // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) return false; // weekend
  return new Date().getHours() < 17;
}

function getTimeSlot(): 'morning' | 'lunch' | 'afternoon' | 'evening' | 'late' {
  const h = new Date().getHours();
  if (h < 11) return 'morning';
  if (h < 14) return 'lunch';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'late';
}

function getSeason(): string {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

function buildCalendarUrl(name: string, area: string | null, address: string | null, dateStr: string, duration: string | null): string {
  const startDate = new Date(dateStr + 'T18:00:00');
  const durationHrs = duration === 'half-day' ? 4 : duration === 'full-day' ? 8 : 2;
  const endDate = new Date(startDate.getTime() + durationHrs * 3600000);

  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dates = `${fmt(startDate)}/${fmt(endDate)}`;
  const location = address || area || '';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: name,
    dates,
    location,
    details: `Added from TaskPilot Planning`,
  });
  return `https://calendar.google.com/calendar/event?${params.toString()}`;
}

// ── Server-side Google Calendar insert (Option A, direct API path) ──
// Tries to POST the event to /api/calendar/create (which uses the user's
// stored OAuth tokens). Returns:
//   'created'        → event was inserted; htmlLink in result
//   'not_connected'  → user needs to connect Google Calendar in Profile
//   'error'          → some other failure; caller should fall back to URL
// Caller is responsible for opening the URL fallback on the non-created paths.
type CalendarCreateResult =
  | { status: 'created'; id: string; htmlLink: string }
  | { status: 'not_connected' }
  | { status: 'error'; detail: string };

async function addToCalendarViaApi(args: {
  summary: string;
  location?: string;
  description?: string;
  dateKey: string;              // YYYY-MM-DD
  duration: string | null;      // null | 'half-day' | 'full-day' | etc
  allDay?: boolean;
  startHour?: number;           // 0-23 local Europe/London
}): Promise<CalendarCreateResult> {
  const {
    summary,
    location = '',
    description = 'Added from TaskPilot Planning',
    dateKey,
    duration,
    allDay = false,
    startHour = 18,
  } = args;

  let startPayload: { dateTime?: string; date?: string; timeZone?: string };
  let endPayload: { dateTime?: string; date?: string; timeZone?: string };

  if (allDay) {
    const next = new Date(dateKey);
    next.setDate(next.getDate() + 1);
    startPayload = { date: dateKey };
    endPayload = { date: next.toISOString().slice(0, 10) };
  } else {
    const durationHrs = duration === 'half-day' ? 4 : duration === 'full-day' ? 8 : 2;
    const startStr = `${dateKey}T${String(startHour).padStart(2, '0')}:00:00`;
    const startDate = new Date(startStr);
    const endDate = new Date(startDate.getTime() + durationHrs * 3600000);
    const iso = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    };
    startPayload = { dateTime: iso(startDate), timeZone: 'Europe/London' };
    endPayload = { dateTime: iso(endDate), timeZone: 'Europe/London' };
  }

  try {
    const res = await fetch('/api/calendar/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary,
        location,
        description,
        start: startPayload,
        end: endPayload,
      }),
    });
    if (res.status === 412) return { status: 'not_connected' };
    if (!res.ok) {
      const text = await res.text();
      return { status: 'error', detail: text };
    }
    const data = await res.json();
    return { status: 'created', id: data.event?.id, htmlLink: data.event?.htmlLink };
  } catch (err) {
    return { status: 'error', detail: err instanceof Error ? err.message : 'unknown' };
  }
}

// One-time session flag so we only nag the user once per page load about
// connecting Google Calendar. If they click through Add-to-Calendar multiple
// times before connecting, the first time is a helpful notice and subsequent
// times just open the URL silently.
let _notConnectedWarned = false;
function warnOnceNotConnected() {
  if (_notConnectedWarned) return;
  _notConnectedWarned = true;
  if (typeof window !== 'undefined') {
    // Small non-blocking notice. alert() is fine for a solo app.
    window.setTimeout(
      () =>
        window.alert(
          'Google Calendar is not connected. Opening a new tab for now — connect in Profile → Connect Google Calendar for one-click add.',
        ),
      100,
    );
  }
}

// ── Weather fetch (Open-Meteo, free, no key) ─────────────

async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=Europe%2FLondon`
    );
    const data = await res.json();
    const temp = data.current?.temperature_2m ?? 15;
    const code = data.current?.weather_code ?? 0;
    return {
      temp,
      weatherCode: code,
      isRainy: WEATHER_RAINY.has(code),
      isSunny: WEATHER_SUNNY.has(code),
      isCold: temp < 8,
      isWarm: temp > 20,
    };
  } catch {
    return { temp: 15, weatherCode: 0, isRainy: false, isSunny: false, isCold: false, isWarm: false };
  }
}

// ── Client-side scoring ──────────────────────────────────

function scorePlace(
  place: PlaceRecord,
  weather: WeatherData,
  timeSlot: string,
  season: string,
  companionMode: string,
  userLat: number,
  userLng: number,
): { score: number; reasons: Record<string, number> } {
  const reasons: Record<string, number> = {};

  // Interest score (30%) — use google_rating + liked + visit history + data richness
  let interest = 40;
  if (place.google_rating) {
    interest = Math.min(100, (place.google_rating / 5) * 80 + 20);
  } else {
    // No rating — add randomised jitter (0–25) to avoid flat ordering
    // Use a hash of the place name for deterministic "randomness" per session
    const hash = place.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    interest = 35 + (hash % 25);
  }
  if (place.liked) interest = Math.min(100, interest + 25);
  if (place.times_visited > 3) interest = Math.max(20, interest - 15);
  // Data richness bonus — places with more tags are more confidently scored
  const tagCount = (place.vibe_tags?.length || 0) + (place.time_tags?.length || 0) +
    (place.weather_tags?.length || 0) + (place.social_tags?.length || 0) +
    (place.cuisine_tags?.length || 0);
  if (tagCount > 5) interest = Math.min(100, interest + 10);
  else if (tagCount > 0) interest = Math.min(100, interest + 5);
  reasons.interest = interest;

  // Weather score (20%) — match weather_tags to current conditions
  let weatherScore = 50;
  const wt = place.weather_tags || [];
  if (weather.isRainy && wt.includes('rainy-day')) weatherScore = 90;
  else if (weather.isRainy && wt.includes('outdoor')) weatherScore = 15;
  else if (weather.isSunny && wt.includes('sunny-day')) weatherScore = 90;
  else if (weather.isSunny && wt.includes('outdoor')) weatherScore = 80;
  if (weather.isCold && wt.includes('cosy')) weatherScore = Math.min(100, weatherScore + 20);
  if (weather.isWarm && wt.includes('outdoor')) weatherScore = Math.min(100, weatherScore + 15);
  reasons.weather = weatherScore;

  // Time score (15%) — match time_tags to current time slot
  let timeScore = 50;
  const tt = place.time_tags || [];
  if (tt.includes(timeSlot)) timeScore = 90;
  else if (tt.length === 0) timeScore = 50; // no tags = neutral
  else timeScore = 30; // has tags but doesn't match
  // Boost food during meal times
  if (place.category.toLowerCase().includes('food') || place.category.toLowerCase().includes('drink')) {
    if (timeSlot === 'lunch' || timeSlot === 'evening') timeScore = Math.min(100, timeScore + 15);
  }
  reasons.time = timeScore;

  // Location score (10%) — proximity to user
  let locationScore = 50;
  if (place.lat && place.lng) {
    const dist = haversineKm(userLat, userLng, place.lat, place.lng);
    if (dist < 1) locationScore = 95;
    else if (dist < 3) locationScore = 75;
    else if (dist < 6) locationScore = 50;
    else if (dist < 10) locationScore = 30;
    else locationScore = 15;
  }
  reasons.location = locationScore;

  // Social score (10%) — match social_tags to companion mode
  let socialScore = 50;
  const st = place.social_tags || [];
  if (st.includes(companionMode)) socialScore = 90;
  else if (st.length === 0) socialScore = 50;
  reasons.social = socialScore;

  // Novelty score (10%) — prefer unvisited or long-ago-visited places
  let noveltyScore = 50;
  if (place.times_visited === 0) noveltyScore = 85;
  else if (place.last_visited) {
    const daysSince = (Date.now() - new Date(place.last_visited).getTime()) / 86400000;
    if (daysSince > 90) noveltyScore = 75;
    else if (daysSince > 30) noveltyScore = 55;
    else if (daysSince > 7) noveltyScore = 30;
    else noveltyScore = 10; // visited very recently
  }
  // Penalise frequently dismissed places
  if (place.times_dismissed > 3) noveltyScore = Math.max(0, noveltyScore - 20);
  reasons.novelty = noveltyScore;

  // Season score (5%)
  let seasonScore = 50;
  const st2 = place.season_tags || [];
  if (st2.includes(season)) seasonScore = 85;
  else if (st2.length === 0) seasonScore = 50; // no tags = neutral
  reasons.season = seasonScore;

  // Weighted total
  const score =
    reasons.interest * WEIGHTS.interest +
    reasons.weather * WEIGHTS.weather +
    reasons.time * WEIGHTS.time +
    reasons.location * WEIGHTS.location +
    reasons.social * WEIGHTS.social +
    reasons.novelty * WEIGHTS.novelty +
    reasons.season * WEIGHTS.season;

  return { score: Math.round(score * 10) / 10, reasons };
}

// ── GPS hook ─────────────────────────────────────────────

function useGeoLocation(onUpdate: (lat: number, lng: number, area: string) => void) {
  const watchRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const handlePosition = async (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      // Throttle updates to once per 5 minutes
      if (Date.now() - lastUpdateRef.current < 300000) return;
      lastUpdateRef.current = Date.now();

      // Reverse geocode via Nominatim (free, no key)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=14`,
          { headers: { 'User-Agent': 'TaskPilot/1.0' } }
        );
        const data = await res.json();
        const area = data.address?.suburb || data.address?.neighbourhood ||
          data.address?.city_district || data.address?.town || 'London';
        onUpdate(latitude, longitude, area);
      } catch {
        // Fall back to coordinates without area name
        onUpdate(latitude, longitude, 'London');
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        // Signal GPS denied — the component will pick this up via a custom event
        window.dispatchEvent(new CustomEvent('gps-denied'));
      }
    };

    // Initial position
    navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000, // 5 min cache
    });

    // Watch for movement
    watchRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 300000,
    });

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, [onUpdate]);
}

// ── Main Component ───────────────────────────────────────

export function PlanningScreen({ embedded = false }: { embedded?: boolean }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion[]>>({});
  const [events, setEvents] = useState<CachedEvent[]>([]);
  const [reviews, setReviews] = useState<VisitReview[]>([]);
  const [context, setContext] = useState<UserContext>({});
  const [loading, setLoading] = useState(true);
  const [rescoring, setRescoring] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'waiting' | 'active' | 'denied'>('waiting');
  const [calendarAdding, setCalendarAdding] = useState<string | null>(null);
  const [dismissedBonusKeys, setDismissedBonusKeys] = useState<Set<string>>(new Set());
  // Full 290-place DB, fetched once per mount — used for bonus-pick lookups
  // when an accepted suggestion anchors a day to a specific location.
  const [allPlaces, setAllPlaces] = useState<PlaceRecord[]>([]);

  const { dates, label: weekLabel } = getWeekDates(weekOffset);

  // Handler for a "bonus pick" (client-side, derived from accepting an anchor).
  // Opens Google Calendar with the place details and injects a synthetic
  // accepted suggestion into local state so the card disappears and can itself
  // anchor further re-suggestions.
  const handleBonusAdd = useCallback(
    async (place: PlaceRecord, anchor: DayAnchor, dateKey: string) => {
      // Try server-side API first (Option A). Fall back to URL if not connected.
      const result = await addToCalendarViaApi({
        summary: place.name,
        location: place.address || place.area || '',
        description: `Added from TaskPilot Planning (bonus pick — near ${anchor.name})`,
        dateKey,
        duration: place.duration,
      });
      if (result.status === 'not_connected') {
        warnOnceNotConnected();
        const calUrl = buildCalendarUrl(place.name, place.area, place.address, dateKey, place.duration);
        window.open(calUrl, '_blank');
      } else if (result.status === 'error') {
        console.error('Bonus pick calendar insert failed:', result.detail);
        const calUrl = buildCalendarUrl(place.name, place.area, place.address, dateKey, place.duration);
        window.open(calUrl, '_blank');
      }
      // On 'created' we say nothing — the card flips to accepted-state via
      // setSuggestions below and the user sees the green "✓ Added to calendar".
      const syntheticId = -Math.floor(Math.random() * 1_000_000) - 1000;
      const synthetic: Suggestion = {
        id: syntheticId,
        place_id: place.id,
        suggestion_date: dateKey,
        suggested_for: anchor.suggested_for,
        score: 0,
        scoring_reasons: { nearby_bonus: 15 },
        status: 'accepted',
        name: place.name,
        category: place.category,
        subcategory: place.subcategory,
        area: place.area,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        google_maps_url: place.google_maps_url,
        website: place.website,
        google_rating: place.google_rating,
        vibe_tags: place.vibe_tags,
        time_tags: place.time_tags,
        weather_tags: place.weather_tags,
        social_tags: place.social_tags,
        price_tier: place.price_tier,
        booking_type: place.booking_type,
        duration: place.duration,
        notes: place.notes,
        times_visited: place.times_visited,
        liked: place.liked,
        cuisine_tags: place.cuisine_tags,
      };
      setSuggestions(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), synthetic],
      }));
    },
    []
  );

  const handleBonusDismiss = useCallback((place: PlaceRecord, dateKey: string) => {
    setDismissedBonusKeys(prev => {
      const next = new Set(prev);
      next.add(`${dateKey}::${place.id}`);
      return next;
    });
  }, []);

  // GPS integration
  const handleGeoUpdate = useCallback(async (lat: number, lng: number, area: string) => {
    setGpsStatus('active');
    setContext(prev => ({ ...prev, location: { area, lat, lng } }));
    // Persist to server
    try {
      await fetch('/api/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'location', value: { area, lat, lng } }),
      });
    } catch (e) {
      console.error('Failed to update location context:', e);
    }
  }, []);

  useGeoLocation(handleGeoUpdate);

  // Listen for GPS denial
  useEffect(() => {
    const handler = () => setGpsStatus('denied');
    window.addEventListener('gps-denied', handler);
    return () => window.removeEventListener('gps-denied', handler);
  }, []);

  // Fetch weather on mount and when location changes
  useEffect(() => {
    const lat = context.location?.lat ?? 51.5235;
    const lng = context.location?.lng ?? -0.0775;
    fetchWeather(lat, lng).then(setWeather);
  }, [context.location?.lat, context.location?.lng]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const from = formatDate(dates[0]);
      const to = formatDate(dates[6]);

      const [eventsRes, contextRes, reviewsRes, ...dayResults] = await Promise.all([
        fetch(`/api/events?from=${from}T00:00:00Z&to=${to}T23:59:59Z`),
        fetch('/api/context'),
        fetch(`/api/visits?week=${from}`),
        ...dates.map(d => fetch(`/api/suggestions?date=${formatDate(d)}`)),
      ]);

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
      if (contextRes.ok) {
        const data = await contextRes.json();
        setContext(data.context || {});
      }
      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        setReviews(data.reviews || []);
      }

      const suggMap: Record<string, Suggestion[]> = {};
      for (let i = 0; i < dates.length; i++) {
        const dateKey = formatDate(dates[i]);
        if (dayResults[i].ok) {
          const data = await dayResults[i].json();
          suggMap[dateKey] = (data.suggestions || []).filter((s: Suggestion) => s.status !== 'dismissed');
        } else {
          suggMap[dateKey] = [];
        }
      }
      setSuggestions(suggMap);
    } catch (err) {
      console.error('Failed to fetch planning data:', err);
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // One-shot places fetch — the whole DB, cached for the session, used by
  // the bonus-pick "re-suggest near your calendar" feature.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/places?limit=500');
        if (!res.ok) return;
        const data = await res.json() as { places: PlaceRecord[] };
        if (!cancelled) setAllPlaces(data.places || []);
      } catch (e) {
        console.error('Failed to fetch all places for bonus picks:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Client-side rescoring ("Suggest Now") ──────────────

  const handleRescore = async () => {
    setRescoring(true);
    try {
      const lat = context.location?.lat ?? 51.5235;
      const lng = context.location?.lng ?? -0.0775;
      const companionMode = context.companions?.mode || 'solo';
      const timeSlot = getTimeSlot();
      const currentSeason = getSeason();

      // Fetch all places + fresh weather in parallel
      const [placesRes, freshWeather] = await Promise.all([
        fetch('/api/places?limit=500'),
        fetchWeather(lat, lng),
      ]);

      setWeather(freshWeather);

      if (!placesRes.ok) {
        // Fall back to just refreshing from server
        await fetchData();
        return;
      }

      const { places } = await placesRes.json() as { places: PlaceRecord[] };

      if (!places || places.length === 0) {
        // No places in DB yet — can't score
        await fetchData();
        return;
      }

      // Score every place
      const scored = places.map(p => {
        const { score, reasons } = scorePlace(p, freshWeather, timeSlot, currentSeason, companionMode, lat, lng);
        return { place: p, score, reasons };
      });

      // Sort descending, take top 5 for today
      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, 5);

      // Build suggestion-shaped objects for today
      const todayKey = formatDate(new Date());
      const localSuggestions: Suggestion[] = top.map((item, idx) => ({
        id: -(idx + 1), // negative IDs = local/unsaved
        place_id: item.place.id,
        suggestion_date: todayKey,
        suggested_for: timeSlot,
        score: item.score,
        scoring_reasons: item.reasons,
        status: 'pending',
        name: item.place.name,
        category: item.place.category,
        subcategory: item.place.subcategory,
        area: item.place.area,
        address: item.place.address,
        lat: item.place.lat,
        lng: item.place.lng,
        google_maps_url: item.place.google_maps_url,
        website: item.place.website,
        google_rating: item.place.google_rating,
        vibe_tags: item.place.vibe_tags,
        time_tags: item.place.time_tags,
        weather_tags: item.place.weather_tags,
        social_tags: item.place.social_tags,
        price_tier: item.place.price_tier,
        booking_type: item.place.booking_type,
        duration: item.place.duration,
        notes: item.place.notes,
        times_visited: item.place.times_visited,
        liked: item.place.liked,
        cuisine_tags: item.place.cuisine_tags,
      }));

      setSuggestions(prev => ({ ...prev, [todayKey]: localSuggestions }));
    } catch (err) {
      console.error('Rescore failed:', err);
      await fetchData();
    } finally {
      setRescoring(false);
    }
  };

  // ── Actions ────────────────────────────────────────────

  const handleAction = async (suggestionId: number, placeId: string, action: 'accepted' | 'dismissed') => {
    if (action === 'accepted') {
      // Find the suggestion to get place details
      for (const key in suggestions) {
        const s = suggestions[key].find(s => s.id === suggestionId);
        if (s) {
          setCalendarAdding(s.place_id);
          // Option A — API-direct insert. Falls back to URL if not connected / error.
          const result = await addToCalendarViaApi({
            summary: s.name,
            location: s.address || s.area || '',
            description: `Added from TaskPilot Planning (suggestion score ${s.score})`,
            dateKey: key,
            duration: s.duration,
          });
          if (result.status === 'not_connected') {
            warnOnceNotConnected();
            window.open(buildCalendarUrl(s.name, s.area, s.address, key, s.duration), '_blank');
          } else if (result.status === 'error') {
            console.error('Suggestion calendar insert failed:', result.detail);
            window.open(buildCalendarUrl(s.name, s.area, s.address, key, s.duration), '_blank');
          }
          setCalendarAdding(null);
          break;
        }
      }
    }

    try {
      // Only call API for server-side suggestions (positive IDs)
      if (suggestionId > 0) {
        // Find the suggestion_date so the PATCH handler can auto-create a
        // visit_review for the right week when the action is "accepted".
        let suggestionDate: string | undefined;
        for (const key in suggestions) {
          if (suggestions[key].some(s => s.id === suggestionId)) {
            suggestionDate = key; // YYYY-MM-DD
            break;
          }
        }
        await fetch('/api/suggestions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: suggestionId, status: action, place_id: placeId, suggestion_date: suggestionDate }),
        });
      }
      // Optimistic update
      setSuggestions(prev => {
        const updated = { ...prev };
        for (const key in updated) {
          updated[key] = updated[key].map(s =>
            s.id === suggestionId ? { ...s, status: action } : s
          ).filter(s => s.status !== 'dismissed');
        }
        return updated;
      });
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  const handleEventAction = async (eventId: string, action: 'accepted' | 'dismissed') => {
    if (action === 'accepted') {
      // Find the event and insert into Google Calendar via API (with URL fallback).
      const event = events.find(e => e.id === eventId);
      if (event) {
        // Skip re-adding events that were sourced from gcal itself — they're
        // already on the calendar. Stable IDs from calendar-sync are prefixed
        // with "gcal-".
        const alreadyOnCalendar = event.id.startsWith('gcal-');

        // Build URL fallback once (used on not_connected / error paths).
        const buildEventUrl = () => {
          const startDate = new Date(event.date_start);
          const endDate = event.date_end ? new Date(event.date_end) : new Date(startDate.getTime() + 2 * 3600000);
          const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
          const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: event.title,
            dates: `${fmt(startDate)}/${fmt(endDate)}`,
            location: event.venue || '',
            details: event.url ? `More info: ${event.url}` : 'Added from TaskPilot',
          });
          return `https://calendar.google.com/calendar/event?${params.toString()}`;
        };

        if (!alreadyOnCalendar) {
          setCalendarAdding(event.id);
          try {
            // Detect all-day vs timed based on date_start format.
            // "YYYY-MM-DD" → all-day; anything with T/time → timed.
            const ds = event.date_start;
            const isAllDay = /^\d{4}-\d{2}-\d{2}$/.test(ds) || ds.endsWith('T00:00:00') || ds.endsWith('T00:00:00.000Z');
            const dateKey = ds.slice(0, 10);

            let result: CalendarCreateResult;
            if (isAllDay) {
              result = await addToCalendarViaApi({
                summary: event.title,
                location: event.venue || '',
                description: event.url ? `More info: ${event.url}` : 'Added from TaskPilot',
                dateKey,
                duration: null,
                allDay: true,
              });
            } else {
              // Timed event — extract start hour from the ISO string.
              const startDate = new Date(ds);
              const startHour = startDate.getHours();
              // Derive duration in hours from date_end if present, else default 2h.
              let durationHrs = 2;
              if (event.date_end) {
                const endDate = new Date(event.date_end);
                const diffMs = endDate.getTime() - startDate.getTime();
                if (diffMs > 0) durationHrs = Math.max(1, Math.round(diffMs / 3600000));
              }
              const durationLabel =
                durationHrs >= 8 ? 'full-day' : durationHrs >= 4 ? 'half-day' : null;
              result = await addToCalendarViaApi({
                summary: event.title,
                location: event.venue || '',
                description: event.url ? `More info: ${event.url}` : 'Added from TaskPilot',
                dateKey,
                duration: durationLabel,
                startHour,
              });
            }

            if (result.status === 'not_connected') {
              warnOnceNotConnected();
              window.open(buildEventUrl(), '_blank');
            } else if (result.status === 'error') {
              console.error('Event calendar insert failed:', result.detail);
              window.open(buildEventUrl(), '_blank');
            }
          } finally {
            setCalendarAdding(null);
          }
        }
      }
    }

    try {
      await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, status: action }),
      });
      if (action === 'dismissed') {
        setEvents(prev => prev.filter(e => e.id !== eventId));
      } else {
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: 'accepted' } : e));
      }
    } catch (err) {
      console.error('Event action failed:', err);
    }
  };

  const handleReviewAction = async (reviewId: number, placeId: string | null, status: string) => {
    try {
      await fetch('/api/visits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reviewId, status, place_id: placeId }),
      });
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status } : r));
    } catch (err) {
      console.error('Review action failed:', err);
    }
  };

  // "Didn't go" — mark an accepted suggestion as not visited.
  // Posts to the visit review endpoint with status 'skipped'.
  const handleDidntGo = async (suggestionId: number, placeId: string) => {
    try {
      // Find the suggestion date for the visit review
      let suggestionDate: string | undefined;
      for (const key in suggestions) {
        if (suggestions[key].some(s => s.id === suggestionId)) {
          suggestionDate = key;
          break;
        }
      }
      if (suggestionDate) {
        // Create a "skipped" visit review
        await fetch('/api/visits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            place_id: placeId,
            status: 'skipped',
            review_week: suggestionDate,
          }),
        });
      }
      // Optimistic UI — mark the suggestion as dismissed so it visually fades
      setSuggestions(prev => {
        const updated = { ...prev };
        for (const key in updated) {
          updated[key] = updated[key].map(s =>
            s.id === suggestionId ? { ...s, status: 'didnt-go' } : s
          );
        }
        return updated;
      });
    } catch (err) {
      console.error('Didn\'t go action failed:', err);
    }
  };

  const updateContext = async (key: string, value: unknown) => {
    try {
      await fetch('/api/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      setContext(prev => ({ ...prev, [key]: value }));
    } catch (err) {
      console.error('Context update failed:', err);
    }
  };

  const pendingReviews = reviews.filter(r => r.status === 'pending');
  const activeEvents = events.filter(e => e.status !== 'dismissed');

  // ── Render ─────────────────────────────────────────────

  return (
    <div className={`flex flex-col ${embedded ? '' : 'h-full'} bg-gray-50`}>
      {/* Header — hidden when embedded inside CalendarScreen */}
      {!embedded && (
        <div className="bg-white border-b px-4 pt-12 lg:pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900">Events</h1>
            <button
              onClick={handleRescore}
              disabled={rescoring}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-medium active:bg-blue-100 disabled:opacity-50"
            >
              <span className={rescoring ? 'animate-spin' : ''}>✨</span>
              {rescoring ? 'Scoring...' : 'Suggest Now'}
            </button>
          </div>

          {/* Week navigator */}
          <div className="flex items-center justify-between">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 -ml-2 text-gray-500 active:text-gray-800">
              <ChevronLeft />
            </button>
            <button onClick={() => setWeekOffset(0)} className="text-sm font-medium text-gray-700">
              📅 {weekLabel}
            </button>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 -mr-2 text-gray-500 active:text-gray-800">
              <ChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* Embedded header — compact week navigator */}
      {embedded && (
        <div className="flex items-center justify-between px-1 pb-2 pt-1">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 text-gray-500">
            <ChevronLeft />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(0)} className="text-sm font-medium text-gray-700">
              {weekLabel}
            </button>
            <button
              onClick={handleRescore}
              disabled={rescoring}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium active:bg-blue-100 disabled:opacity-50"
            >
              <span className={rescoring ? 'animate-spin' : ''}>✨</span>
              {rescoring ? 'Scoring…' : 'Suggest'}
            </button>
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 text-gray-500">
            <ChevronRight />
          </button>
        </div>
      )}

      {/* Scrollable content */}
      <div className={`${embedded ? 'px-0 pb-6' : 'flex-1 overflow-y-auto px-4 pb-24'}`}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-gray-400 text-sm">Loading suggestions...</div>
          </div>
        ) : (
          <>
            {/* Context panel */}
            <div className="mt-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Context</span>
                {weather && (
                  <span className="text-xs text-gray-500">
                    {weather.isRainy ? '🌧' : weather.isSunny ? '☀️' : '⛅'} {Math.round(weather.temp)}°C
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">📍</span>
                <span className="text-sm text-gray-700">{context.location?.area || 'Shoreditch'}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  gpsStatus === 'active' ? 'bg-green-100 text-green-600' :
                  gpsStatus === 'denied' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {gpsStatus === 'active' ? 'GPS' : gpsStatus === 'denied' ? 'No GPS' : 'auto'}
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {COMPANION_OPTIONS.map(opt => (
                  <button
                    key={opt.mode}
                    onClick={() => updateContext('companions', { mode: opt.mode, detail: null })}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      context.companions?.mode === opt.mode
                        ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                        : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
                {/* Working week toggle */}
                <button
                  onClick={() => updateContext('working_week_mode', !context.working_week_mode)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ml-auto ${
                    context.working_week_mode
                      ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                  title="Working week mode — no suggestions until 5pm on weekdays"
                >
                  <span>{context.working_week_mode ? '💼' : '💼'}</span>
                  <span>Work mode</span>
                </button>
              </div>
            </div>

            {/* Visit reviews */}
            {pendingReviews.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <h3 className="text-sm font-semibold text-amber-800 mb-2">📋 This Week&apos;s Check-in</h3>
                <p className="text-xs text-amber-600 mb-3">Did you go to these?</p>
                {pendingReviews.map(review => (
                  <div key={review.id} className="flex items-center justify-between py-2 border-t border-amber-100 first:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{review.place_name || 'Unknown place'}</p>
                      <p className="text-xs text-gray-500">{review.place_area}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleReviewAction(review.id, review.place_id, 'visited')}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-md active:bg-green-200"
                      >✓ Visited</button>
                      <button
                        onClick={() => handleReviewAction(review.id, review.place_id, 'skipped')}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md active:bg-gray-200"
                      >✗ Nope</button>
                      <button
                        onClick={() => handleReviewAction(review.id, review.place_id, 'go-again')}
                        className="px-2 py-1 text-xs bg-pink-100 text-pink-700 rounded-md active:bg-pink-200"
                      >♡ Again</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Day-by-day suggestions — responsive grid: 1 col mobile, 2 lg, 3 xl */}
            <div className="mt-2 lg:grid lg:grid-cols-2 lg:gap-x-4 xl:grid-cols-3">
            {dates.map(date => {
              const dateKey = formatDate(date);
              // Working week mode: suppress today's suggestions before 5pm on weekdays
              const workingSuppressed = context.working_week_mode && isWorkingHoursSuppressed(date);
              const daySuggestions = workingSuppressed ? [] : (suggestions[dateKey] || []);
              // Dedup — when the user adds an accepted suggestion to Google
              // Calendar via Option A, the next calendar-sync run pulls it
              // back as a gcal-categorised event. We'd then render BOTH rows
              // for the same plan. Filter out any gcal event whose
              // (normalised-title, date) matches an accepted suggestion
              // on the same day.
              const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
              const acceptedTitlesToday = new Set(
                daySuggestions
                  .filter(s => s.status === 'accepted')
                  .map(s => norm(s.name)),
              );
              const dayEvents = activeEvents.filter(e => {
                const eventDate = new Date(e.date_start).toISOString().split('T')[0];
                if (eventDate !== dateKey) return false;
                // Only dedup gcal-sourced events (ids starting with 'gcal-')
                // against accepted suggestions — scraped London events can
                // legitimately share a title with a place suggestion.
                if (e.id.startsWith('gcal-') && acceptedTitlesToday.has(norm(e.title))) {
                  return false;
                }
                return true;
              });
              const isToday = dateKey === formatDate(new Date());
              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
              const dayNumber = date.getDate();
              const weekdayShort = date.toLocaleDateString('en-GB', { weekday: 'short' });

              // Anchors for this day — anything with a location that pins the
              // user to a spot, used for "you'll already be around here" bonus
              // picks. Two sources:
              //   (1) accepted suggestions with lat/lng
              //   (2) gcal-synced events with lat/lng (flea markets, concerts,
              //       dinners, etc — anything calendar-sync has geocoded)
              const suggestionAnchors: DayAnchor[] = daySuggestions
                .filter(s => s.status === 'accepted' && s.lat != null && s.lng != null)
                .map(s => ({
                  id: `sug-${s.id}`,
                  place_id: s.place_id,
                  name: s.name,
                  category: s.category,
                  lat: s.lat as number,
                  lng: s.lng as number,
                  suggested_for: s.suggested_for,
                  source: 'suggestion' as const,
                }));

              const eventAnchors: DayAnchor[] = dayEvents
                .filter(e => e.lat != null && e.lng != null && e.status !== 'dismissed')
                .map(e => {
                  // Derive a suggested_for bucket from the event's start time.
                  // All-day events (no time or midnight) map to 'afternoon' so
                  // the bonus bucket lands somewhere visible. Timed events map
                  // to their actual bucket.
                  const d = new Date(e.date_start);
                  const hour = d.getHours();
                  const isAllDay = /^\d{4}-\d{2}-\d{2}$/.test(e.date_start) || (hour === 0 && d.getMinutes() === 0);
                  const bucket = isAllDay ? 'afternoon' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
                  return {
                    id: e.id,
                    place_id: null,
                    name: e.title,
                    category: e.category,
                    lat: e.lat as number,
                    lng: e.lng as number,
                    // A synthetic suggested_for string used only for bucketFor().
                    suggested_for: bucket,
                    source: 'event' as const,
                  };
                });

              const dayAnchors: DayAnchor[] = [...suggestionAnchors, ...eventAnchors];

              // Compute bonus picks from the full 290-place DB:
              // when an anchor is set, find up to 2 nearby places (<600m) that
              // are (a) not already in today's suggestions, (b) a different
              // category to the anchor, (c) preferably liked. These become
              // "Near your [anchor]" bonus cards.
              type BonusPick = { place: PlaceRecord; anchor: DayAnchor; km: number };
              const usedPlaceIds = new Set(daySuggestions.map(s => s.place_id));
              const bonusPicksByBucket: Record<string, BonusPick[]> = {};
              for (const anchor of dayAnchors) {
                const anchorBucket = bucketFor(anchor.suggested_for);
                const nearby = allPlaces
                  .filter(p =>
                    p.lat != null && p.lng != null &&
                    p.id !== anchor.place_id &&
                    !usedPlaceIds.has(p.id) &&
                    !dismissedBonusKeys.has(`${dateKey}::${p.id}`) &&
                    p.category !== anchor.category &&
                    haversineKm(p.lat, p.lng, anchor.lat, anchor.lng) < 0.6
                  )
                  .map(p => ({
                    place: p,
                    anchor,
                    km: haversineKm(p.lat!, p.lng!, anchor.lat, anchor.lng),
                  }))
                  .sort((a, b) => {
                    // Prefer liked places, then closer ones
                    if (a.place.liked !== b.place.liked) return a.place.liked ? -1 : 1;
                    if ((a.place.google_rating || 0) !== (b.place.google_rating || 0))
                      return (b.place.google_rating || 0) - (a.place.google_rating || 0);
                    return a.km - b.km;
                  })
                  .slice(0, 2);
                for (const n of nearby) {
                  (bonusPicksByBucket[anchorBucket] ||= []).push(n);
                  usedPlaceIds.add(n.place.id); // don't re-suggest same place via another anchor
                }
              }

              // Working week suppression banner (today, weekday, before 5pm)
              if (workingSuppressed) {
                return (
                  <div
                    key={dateKey}
                    className="mt-2 px-3 py-2.5 bg-indigo-50/60 rounded-lg border border-indigo-100 border-l-2 border-l-indigo-400"
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <h2 className="text-xs font-semibold text-indigo-600">{getDayLabel(date)}</h2>
                      <span className="text-[10px] text-gray-400">{weekdayShort} {dayNumber}</span>
                    </div>
                    <p className="text-[11px] text-indigo-500">Suggestions unlock after 5pm — enjoy your workday.</p>
                  </div>
                );
              }

              // Empty day — single-line tight row
              if (daySuggestions.length === 0 && dayEvents.length === 0) {
                return (
                  <div
                    key={dateKey}
                    className={`mt-2 flex items-baseline gap-2 px-1 py-1 border-l-2 ${
                      isPast ? 'opacity-40 border-gray-200' :
                      isToday ? 'border-blue-400' : 'border-gray-200'
                    }`}
                  >
                    <h2 className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                      {getDayLabel(date)}
                    </h2>
                    <span className="text-[10px] text-gray-400">{weekdayShort} {dayNumber}</span>
                    <span className="text-[10px] text-gray-400 italic ml-auto">— free day —</span>
                  </div>
                );
              }

              // Find nearest anchor (within 1.5km) for a suggestion — returns
              // the anchor + distance so the card can badge it and we can re-sort.
              const findNearbyAnchor = (
                s: Suggestion
              ): { anchor: DayAnchor; km: number } | null => {
                if (!s.lat || !s.lng || dayAnchors.length === 0) return null;
                let best: { anchor: DayAnchor; km: number } | null = null;
                for (const a of dayAnchors) {
                  // Don't nearby-match a suggestion to its own anchor row.
                  if (a.source === 'suggestion' && a.place_id === s.place_id) continue;
                  const km = haversineKm(s.lat, s.lng, a.lat, a.lng);
                  if (km > 1.5) continue;
                  if (!best || km < best.km) best = { anchor: a, km };
                }
                return best;
              };

              // ── Capacity awareness ──
              // Days with calendar commitments get fewer suggestions.
              // With 0 events the day is "wide open" → up to 3 per bucket.
              // Each gcal event reduces capacity. 4+ events = very full day,
              // show only 1 per free bucket (enough to catch something nearby).
              const gcalEventCount = dayEvents.filter(e => e.id.startsWith('gcal-')).length;
              const maxPerBucket = gcalEventCount === 0 ? 3
                : gcalEventCount <= 2 ? 2
                : 1; // 3+ calendar events → show at most 1 suggestion per bucket

              // Group suggestions by time-of-day bucket, with accepted pinned first
              const byBucket: Record<string, Array<{ s: Suggestion; nearby: ReturnType<typeof findNearbyAnchor>; adjScore: number }>> = {};
              for (const s of daySuggestions) {
                const b = bucketFor(s.suggested_for);
                const nearby = findNearbyAnchor(s);
                // Boost score significantly for proximity to anchors — on busy days
                // this effectively clusters suggestions near where you'll already be
                const proximityBoost = nearby ? 20 - nearby.km * 10 : 0; // ~20 at 0km, ~5 at 1.5km
                const adjScore = Number(s.score) + proximityBoost;
                (byBucket[b] ||= []).push({ s, nearby, adjScore });
              }
              // Sort within each bucket: accepted pinned to top, then by adjusted score desc
              for (const b of Object.keys(byBucket)) {
                byBucket[b].sort((a, b) => {
                  if (a.s.status === 'accepted' && b.s.status !== 'accepted') return -1;
                  if (b.s.status === 'accepted' && a.s.status !== 'accepted') return 1;
                  return b.adjScore - a.adjScore;
                });
                // Trim to capacity — keep accepted items + top N pending
                const accepted = byBucket[b].filter(x => x.s.status === 'accepted');
                const pending = byBucket[b].filter(x => x.s.status !== 'accepted').slice(0, maxPerBucket);
                byBucket[b] = [...accepted, ...pending];
              }

              return (
                <div key={dateKey} className={`mt-3 lg:mt-0 lg:mb-4 ${isPast ? 'opacity-60' : ''}`}>
                  {/* Day header */}
                  <div className={`flex items-baseline gap-2 mb-1.5 pl-1 border-l-2 ${
                    isToday ? 'border-blue-500' : 'border-gray-300'
                  }`}>
                    <h2 className={`text-base font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {getDayLabel(date)}
                    </h2>
                    <span className="text-xs text-gray-500">{weekdayShort} {dayNumber}</span>
                    <span className="text-[10px] text-gray-400 ml-auto">
                      {gcalEventCount > 0 && `${gcalEventCount} planned`}
                      {gcalEventCount > 0 && daySuggestions.length > 0 && ' · '}
                      {daySuggestions.length > 0 && `${daySuggestions.length} pick${daySuggestions.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>

                  {/* Day-level events (all-day, no time bucket) */}
                  {dayEvents.map(event => (
                    <EventCard key={event.id} event={event} onAction={handleEventAction} />
                  ))}

                  {/* Time-of-day sections */}
                  {TIME_BUCKETS.map(bucket => {
                    const picks = byBucket[bucket.key] || [];
                    const bonusPicks = bonusPicksByBucket[bucket.key] || [];
                    if (picks.length === 0 && bonusPicks.length === 0) return null;
                    return (
                      <div key={bucket.key} className="mb-2">
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-xs">{bucket.icon}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                            {bucket.label}
                          </span>
                          <div className="flex-1 h-px bg-gray-200 ml-1" />
                        </div>
                        {picks.map(({ s, nearby }) => (
                          <SuggestionCard
                            key={s.id}
                            suggestion={s}
                            onAction={handleAction}
                            calendarAdding={calendarAdding}
                            nearbyAnchor={nearby ? { name: nearby.anchor.name, km: nearby.km } : null}
                            isPast={isPast}
                            onDidntGo={handleDidntGo}
                          />
                        ))}
                        {bonusPicks.map(bp => (
                          <BonusPickCard
                            key={`bonus-${bp.place.id}`}
                            place={bp.place}
                            anchor={bp.anchor}
                            km={bp.km}
                            dateKey={dateKey}
                            onAdd={handleBonusAdd}
                            onDismiss={handleBonusDismiss}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            </div>

            {/* Events are now shown inline on each day — no separate section needed */}

            {/* Empty state */}
            {Object.values(suggestions).every(s => s.length === 0) && activeEvents.length === 0 && pendingReviews.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">✨</p>
                <p className="text-sm font-medium text-gray-600 mb-1">No suggestions yet</p>
                <p className="text-xs text-gray-400">The activity engine runs daily at 2 AM.<br/>Tap &quot;Suggest Now&quot; to get instant picks based on your location, weather, and time.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Card Components ───────────────────────────────────────

function SuggestionCard({ suggestion: s, onAction, calendarAdding, nearbyAnchor, isPast, onDidntGo }: {
  suggestion: Suggestion;
  onAction: (id: number, placeId: string, action: 'accepted' | 'dismissed') => void;
  calendarAdding: string | null;
  nearbyAnchor?: { name: string; km: number } | null;
  isPast?: boolean;
  onDidntGo?: (suggestionId: number, placeId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const emoji = CATEGORY_EMOJI[s.category] || CATEGORY_EMOJI[s.category?.toLowerCase()] || '📍';
  const booking = s.booking_type ? BOOKING_LABELS[s.booking_type] : null;
  const isAccepted = s.status === 'accepted';
  const isDidntGo = s.status === 'didnt-go';
  const isLocal = s.id < 0;

  // Meta line: subcategory → cuisine → duration
  const subLabel = s.subcategory
    ? s.subcategory.split(',').map(x => titleCase(x.trim())).filter(Boolean).slice(0, 2).join(' · ')
    : titleCase(s.category || '');
  const cuisineLabel = (s.cuisine_tags || []).slice(0, 2).map(titleCase).join(' · ');
  const durationLabel = s.duration ? titleCase(s.duration) : null;

  // Vibe tags (cap at 3 for line budget)
  const vibeTags = (s.vibe_tags || []).slice(0, 3);

  // Top scoring reasons — split numeric (graded, sortable) from label fields (e.g. forecast_confidence)
  const rawReasons = s.scoring_reasons ? Object.entries(s.scoring_reasons) : [];
  const numericReasons = rawReasons
    .filter(([, v]) => typeof v === 'number' && Number.isFinite(v as number))
    .sort(([, a], [, b]) => (b as number) - (a as number)) as [string, number][];
  const labelReasons = rawReasons.filter(
    ([, v]) => typeof v === 'string' || !Number.isFinite(v as number),
  ) as [string, string][];

  return (
    <div className={`mb-1.5 px-3 py-2 bg-white rounded-lg border shadow-sm ${
      isDidntGo ? 'border-gray-200 bg-gray-50/50 opacity-60' :
      isAccepted ? 'border-green-200 bg-green-50/50' :
      isLocal ? 'border-blue-200 bg-blue-50/30' :
      'border-gray-100'
    }`}>
      {/* Title row */}
      <div className="flex items-start gap-2">
        <span className="text-base leading-none mt-0.5">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{s.name}</h3>
            {s.google_rating && (
              <span className="text-[11px] text-gray-500 shrink-0">
                <span className="text-amber-500">★</span> {s.google_rating}
              </span>
            )}
            {isLocal && (
              <span className="text-[9px] px-1 rounded bg-blue-100 text-blue-600 font-medium shrink-0">LIVE</span>
            )}
            <span className="ml-auto text-[10px] text-gray-400 shrink-0">{Math.round(s.score)}</span>
          </div>

          {/* Meta line — subcategory/cuisine · area · price · duration */}
          <div className="text-[11px] text-gray-600 truncate">
            {subLabel && <span>{subLabel}</span>}
            {cuisineLabel && <span> · {cuisineLabel}</span>}
            {s.area && <span> · <span className="text-gray-500">{titleCase(s.area)}</span></span>}
            {s.price_tier && <span> · <span className="text-gray-500">{s.price_tier}</span></span>}
            {durationLabel && <span> · {durationLabel}</span>}
          </div>

          {/* Tags row */}
          {(booking || vibeTags.length > 0 || s.liked || nearbyAnchor) && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {nearbyAnchor && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                  📍 {nearbyAnchor.km < 0.5
                    ? `Next to ${nearbyAnchor.name}`
                    : `${nearbyAnchor.km.toFixed(1)}km from ${nearbyAnchor.name}`}
                </span>
              )}
              {booking && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${booking.color}`}>
                  {booking.label}
                </span>
              )}
              {s.liked && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-medium">♡</span>
              )}
              {vibeTags.map(t => (
                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {titleCase(t)}
                </span>
              ))}
              {s.times_visited > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                  {s.times_visited}× visited
                </span>
              )}
            </div>
          )}

          {/* Notes (single line, clickable to expand) */}
          {s.notes && (
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 italic">{s.notes}</p>
          )}
        </div>
      </div>

      {/* Expanded detail — address + scoring breakdown */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
          {s.address && (
            <div className="text-[11px] text-gray-600">📍 {s.address}</div>
          )}
          {(numericReasons.length > 0 || labelReasons.length > 0) && (
            <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
              {numericReasons.map(([k, v]) => (
                <span key={k} className="text-[10px] text-gray-500">
                  {k.replace(/_/g, ' ')}{' '}
                  <span className={`font-semibold ${
                    v >= 15 ? 'text-green-600' :
                    v < 5 ? 'text-red-400' :
                    'text-gray-600'
                  }`}>
                    {Math.round(v)}
                  </span>
                </span>
              ))}
              {labelReasons.map(([k, v]) => (
                <span key={k} className="text-[10px] text-gray-500">
                  {k.replace(/_/g, ' ')}{' '}
                  <span className={`font-semibold ${
                    v === 'high' ? 'text-green-600' :
                    v === 'low' ? 'text-amber-600' :
                    'text-gray-600'
                  }`}>
                    {v}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions — compact row */}
      {isDidntGo ? (
        <div className="mt-1.5 text-[11px] text-gray-400 font-medium">Didn&apos;t go</div>
      ) : !isAccepted ? (
        <div className="flex items-center gap-1 mt-1.5">
          <button
            onClick={() => onAction(s.id, s.place_id, 'accepted')}
            disabled={calendarAdding === s.place_id}
            className="flex-1 py-1 bg-blue-50 text-blue-600 rounded-md text-[11px] font-medium active:bg-blue-100 disabled:opacity-50"
          >
            📅 Calendar
          </button>
          {s.google_maps_url && (
            <a
              href={s.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 bg-gray-50 text-gray-600 rounded-md text-[11px] font-medium active:bg-gray-100"
              title="Open in Google Maps"
            >
              📍
            </a>
          )}
          {s.website && (
            <a
              href={s.website}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 bg-gray-50 text-gray-600 rounded-md text-[11px] font-medium active:bg-gray-100"
              title="Website"
            >
              🔗
            </a>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2 py-1 bg-gray-50 text-gray-500 rounded-md text-[11px] font-medium active:bg-gray-100"
            title="More info"
          >
            {expanded ? '▲' : 'ⓘ'}
          </button>
          <button
            onClick={() => onAction(s.id, s.place_id, 'dismissed')}
            className="px-2 py-1 bg-gray-50 text-gray-500 rounded-md text-[11px] font-medium active:bg-gray-100"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      ) : isPast ? (
        /* Past accepted suggestion — show Went / Didn't go buttons */
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[11px] text-green-600 font-medium mr-auto">Added to calendar</span>
          {onDidntGo && (
            <>
              <button
                onClick={() => {
                  // Mark as "visited" — same endpoint as didnt-go but with visited status
                  fetch('/api/visits', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      place_id: s.place_id,
                      status: 'visited',
                      review_week: s.suggestion_date,
                    }),
                  }).catch(console.error);
                }}
                className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-[11px] font-medium active:bg-green-200"
              >
                Went
              </button>
              <button
                onClick={() => onDidntGo(s.id, s.place_id)}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[11px] font-medium active:bg-gray-200"
              >
                Didn&apos;t go
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-1.5 text-[11px] text-green-600 font-medium">Added to calendar</div>
      )}
    </div>
  );
}

function BonusPickCard({
  place,
  anchor,
  km,
  dateKey,
  onAdd,
  onDismiss,
}: {
  place: PlaceRecord;
  anchor: DayAnchor;
  km: number;
  dateKey: string;
  onAdd: (place: PlaceRecord, anchor: DayAnchor, dateKey: string) => void;
  onDismiss: (place: PlaceRecord, dateKey: string) => void;
}) {
  const emoji = CATEGORY_EMOJI[place.category] || CATEGORY_EMOJI[place.category?.toLowerCase()] || '📍';
  const distanceLabel = km < 0.1 ? 'next door' : km < 0.5 ? `${Math.round(km * 1000)}m away` : `${km.toFixed(1)}km away`;

  return (
    <div className="mb-1.5 ml-3 px-3 py-2 bg-emerald-50/60 rounded-lg border border-emerald-200 shadow-sm relative">
      {/* left accent bar */}
      <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-full" />
      <div className="flex items-start gap-2">
        <span className="text-base leading-none mt-0.5">✨</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm">{emoji}</span>
            <h3 className="text-sm font-semibold text-gray-900 truncate">{place.name}</h3>
            {place.google_rating && (
              <span className="text-[11px] text-gray-500 shrink-0">
                <span className="text-amber-500">★</span> {place.google_rating}
              </span>
            )}
            {place.liked && (
              <span className="text-[10px] text-pink-500 shrink-0">♡</span>
            )}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium truncate">
            Near your {anchor.name} — {distanceLabel}
          </div>
          <div className="text-[11px] text-gray-600 truncate">
            {place.subcategory
              ? place.subcategory.split(',').slice(0, 2).map(x => titleCase(x.trim())).join(' · ')
              : titleCase(place.category || '')}
            {place.area && <span> · {titleCase(place.area)}</span>}
            {place.price_tier && <span> · {place.price_tier}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1.5">
        <button
          onClick={() => onAdd(place, anchor, dateKey)}
          className="flex-1 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[11px] font-medium active:bg-emerald-200"
        >
          📅 Add to Calendar
        </button>
        {place.google_maps_url && (
          <a
            href={place.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 bg-white text-gray-600 rounded-md text-[11px] font-medium active:bg-gray-100 border border-emerald-200"
            title="Open in Google Maps"
          >
            📍
          </a>
        )}
        {place.website && (
          <a
            href={place.website}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 bg-white text-gray-600 rounded-md text-[11px] font-medium active:bg-gray-100 border border-emerald-200"
            title="Website"
          >
            🔗
          </a>
        )}
        <button
          onClick={() => onDismiss(place, dateKey)}
          className="px-2 py-1 bg-white text-gray-500 rounded-md text-[11px] font-medium active:bg-gray-100 border border-emerald-200"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function EventCard({ event, onAction }: {
  event: CachedEvent;
  onAction: (id: string, action: 'accepted' | 'dismissed') => void;
}) {
  const emoji = event.category ? (CATEGORY_EMOJI[event.category] || CATEGORY_EMOJI[event.category.toLowerCase()] || '📅') : '📅';
  const isClosingSoon = event.closing_date && new Date(event.closing_date) <= new Date(Date.now() + 7 * 86400000);
  const isFromCalendar = event.id.startsWith('gcal-');
  const isAccepted = event.status === 'accepted';

  return (
    <div className={`mb-2 p-3 bg-white rounded-xl border shadow-sm ${
      isFromCalendar ? 'border-blue-100 bg-blue-50/30' :
      isAccepted ? 'border-green-200 bg-green-50/50' : 'border-gray-100'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm">{emoji}</span>
            <h3 className="text-sm font-semibold text-gray-900 truncate">{event.title}</h3>
            {isFromCalendar && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium shrink-0">
                On calendar
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {event.venue && <span>{event.venue}</span>}
            {event.price && <span>· {event.price}</span>}
          </div>
          {event.reason && (
            <p className="text-xs text-gray-500 mt-1">{event.reason}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1.5">
            {isClosingSoon && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                Closing soon
              </span>
            )}
            {event.tags?.filter(t => t !== 'gcal' && t !== 'personal').slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {isFromCalendar ? (
        /* Calendar events — show links, not accept/dismiss */
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-blue-50">
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium active:bg-blue-100"
            >
              More info
            </a>
          )}
          {event.venue && (
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(event.venue + ' London')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium active:bg-gray-100"
            >
              Map
            </a>
          )}
          <button
            onClick={() => onAction(event.id, 'dismissed')}
            className="ml-auto px-3 py-1.5 bg-gray-50 text-gray-400 rounded-lg text-xs font-medium active:bg-gray-100"
            title="Hide from planning"
          >
            Hide
          </button>
        </div>
      ) : !isAccepted ? (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
          <button
            onClick={() => onAction(event.id, 'accepted')}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium active:bg-blue-100"
          >
            Add to Calendar
          </button>
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium active:bg-gray-100"
            >
              Info
            </a>
          )}
          <button
            onClick={() => onAction(event.id, 'dismissed')}
            className="px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-medium active:bg-gray-100"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-green-100">
          <span className="text-xs text-green-600 font-medium">Added to calendar</span>
        </div>
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
