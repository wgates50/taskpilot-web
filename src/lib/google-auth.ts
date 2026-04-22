// Google OAuth 2.0 helper — fetch-based, no googleapis dependency.
// Used for server-side Google Calendar writes so "Add to Calendar" in the
// Planning tab goes straight through the Calendar API instead of opening a URL.
//
// Required env vars (set on Vercel):
//   GOOGLE_OAUTH_CLIENT_ID
//   GOOGLE_OAUTH_CLIENT_SECRET
//   GOOGLE_OAUTH_REDIRECT_URI  (e.g. https://taskpilot-web.vercel.app/api/auth/google/callback)
//
// Tokens are stored in the user_context table under key "google_oauth_tokens"
// via setUserContext / getUserContext. Single-user app, so we don't partition
// by user id — there's only one Will.

import { getUserContext, setUserContext } from './db';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

// Calendar scope — read + write events on the user's calendars.
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
  scope: string;
  token_type: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

function envOrThrow(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}. See GOOGLE_OAUTH_SETUP.md`);
  return val;
}

/** Build the Google consent URL the user redirects to. */
export function getAuthUrl(state: string = ''): string {
  const params = new URLSearchParams({
    client_id: envOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
    redirect_uri: envOrThrow('GOOGLE_OAUTH_REDIRECT_URI'),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline', // required to get a refresh_token
    prompt: 'consent',       // forces refresh_token issuance on re-consent
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/** Exchange an authorization code for access + refresh tokens. */
export async function exchangeCode(code: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    code,
    client_id: envOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
    client_secret: envOrThrow('GOOGLE_OAUTH_CLIENT_SECRET'),
    redirect_uri: envOrThrow('GOOGLE_OAUTH_REDIRECT_URI'),
    grant_type: 'authorization_code',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  const data: GoogleTokenResponse = await res.json();
  if (!data.refresh_token) {
    // This happens if the user has already consented once without revoking —
    // Google only issues a refresh_token on first consent. `prompt=consent`
    // should prevent this but belt-and-braces.
    throw new Error(
      'No refresh_token returned. Revoke at https://myaccount.google.com/permissions and reconnect.',
    );
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    scope: data.scope,
    token_type: data.token_type,
  };
}

/** Refresh an expired access token using the stored refresh_token. */
export async function refreshAccessToken(refresh_token: string): Promise<Pick<StoredTokens, 'access_token' | 'expires_at'>> {
  const body = new URLSearchParams({
    client_id: envOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
    client_secret: envOrThrow('GOOGLE_OAUTH_CLIENT_SECRET'),
    refresh_token,
    grant_type: 'refresh_token',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }
  const data: GoogleTokenResponse = await res.json();
  return {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

/** Persist fresh tokens to the user_context table. */
export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await setUserContext('google_oauth_tokens', tokens);
}

/** Load tokens from user_context (or null if the user hasn't connected). */
export async function loadTokens(): Promise<StoredTokens | null> {
  const value = await getUserContext('google_oauth_tokens');
  if (!value || typeof value !== 'object') return null;
  return value as StoredTokens;
}

/**
 * Get a valid access token. Refreshes automatically if the stored one is
 * within 60 seconds of expiry. Returns null if the user hasn't connected.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;

  const stillValid = tokens.expires_at - Date.now() > 60_000;
  if (stillValid) return tokens.access_token;

  // Expired — refresh and persist.
  const refreshed = await refreshAccessToken(tokens.refresh_token);
  const updated: StoredTokens = { ...tokens, ...refreshed };
  await saveTokens(updated);
  return updated.access_token;
}

export interface CalendarEventInput {
  summary: string;                 // event title
  location?: string;               // free-text address
  description?: string;            // notes / deep link back to TaskPilot
  // Either start.dateTime (timed) or start.date (all-day) must be set.
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
}

export interface CalendarEventResult {
  id: string;
  htmlLink: string;
  status: string;
  summary: string;
}

/** Insert an event into the user's primary calendar. Returns the new event. */
export async function createCalendarEvent(
  event: CalendarEventInput,
): Promise<CalendarEventResult> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('NOT_CONNECTED');
  }

  const res = await fetch(CALENDAR_EVENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar insert failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return {
    id: data.id,
    htmlLink: data.htmlLink,
    status: data.status,
    summary: data.summary,
  };
}

/** Check whether Google Calendar is connected (tokens present and scope is right). */
export async function getConnectionStatus(): Promise<{
  connected: boolean;
  scope?: string;
  expiresAt?: number;
}> {
  const tokens = await loadTokens();
  if (!tokens) return { connected: false };
  return {
    connected: true,
    scope: tokens.scope,
    expiresAt: tokens.expires_at,
  };
}

// ── Listing, updating, deleting calendar events ──────────

export interface CalendarItem {
  id: string;
  summary: string;
  location?: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  htmlLink?: string;
  status?: string;
  organizer?: { self?: boolean; email?: string };
  creator?: { self?: boolean; email?: string };
  attendees?: Array<{ email?: string; self?: boolean; responseStatus?: string }>;
  recurringEventId?: string;
  transparency?: string;      // "transparent" = free (non-blocking)
  eventType?: string;         // "default", "outOfOffice", "focusTime", etc.
  updated?: string;
}

/**
 * List events from the user's primary calendar between two instants.
 * timeMin / timeMax are ISO strings. singleEvents=true expands recurring
 * instances so the UI can render them at their actual occurrence times.
 */
export async function listCalendarEvents(
  timeMin: string,
  timeMax: string,
): Promise<CalendarItem[]> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error('NOT_CONNECTED');

  const url = new URL(CALENDAR_EVENTS_URL);
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar list failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return (data.items ?? []) as CalendarItem[];
}

/** PATCH an event in the user's primary calendar. */
export async function updateCalendarEvent(
  id: string,
  patch: Partial<CalendarEventInput>,
): Promise<CalendarItem> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error('NOT_CONNECTED');

  const res = await fetch(`${CALENDAR_EVENTS_URL}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar update failed: ${res.status} ${text}`);
  }
  return (await res.json()) as CalendarItem;
}

/** DELETE an event from the user's primary calendar. */
export async function deleteCalendarEvent(id: string): Promise<void> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error('NOT_CONNECTED');

  const res = await fetch(`${CALENDAR_EVENTS_URL}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 204 No Content on success; 410 Gone is OK (already deleted).
  if (!res.ok && res.status !== 410) {
    const text = await res.text();
    throw new Error(`Calendar delete failed: ${res.status} ${text}`);
  }
}
