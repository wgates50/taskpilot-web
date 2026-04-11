# Google Calendar OAuth Setup (Option A)

One-time setup so TaskPilot can insert events directly into your Google Calendar
via the Planning tab's **Add to Calendar** button — no more opening a new tab.

## What you're building

A Google OAuth 2.0 "Web application" client that grants TaskPilot a long-lived
refresh token for your account. The token is stored server-side in Postgres
(`user_context` table, key `google_oauth_tokens`). On each Add-to-Calendar
click, the app refreshes the access token if needed and calls
`calendar.events.insert` on your primary calendar.

## 1. Create an OAuth client in Google Cloud

1. Go to https://console.cloud.google.com/ and select (or create) a project —
   reuse the project that already owns your gcal MCP credentials if you have
   one, otherwise create **TaskPilot Web**.
2. In the left nav: **APIs & Services → Enabled APIs & Services**. Click
   **+ ENABLE APIS AND SERVICES**, search **Google Calendar API**, enable it.
3. In the left nav: **APIs & Services → OAuth consent screen**.
   - User type: **External**. Click Create.
   - App name: `TaskPilot`
   - User support email: `wgates50@gmail.com`
   - Developer contact: `wgates50@gmail.com`
   - Save & Continue.
   - **Scopes**: click **Add or Remove Scopes**, search for and add:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/calendar.readonly`
   - Save & Continue.
   - **Test users**: add `wgates50@gmail.com`. Save & Continue.
   - (App can stay in "Testing" mode indefinitely for single-user use — the
     refresh token will work as long as you're listed as a test user.)
4. In the left nav: **APIs & Services → Credentials**.
   - Click **+ CREATE CREDENTIALS → OAuth client ID**.
   - Application type: **Web application**.
   - Name: `TaskPilot Web`.
   - **Authorized redirect URIs** — add BOTH of these:
     - `http://localhost:3000/api/auth/google/callback`
     - `https://<your-vercel-domain>/api/auth/google/callback`
       (e.g. `https://taskpilot-web.vercel.app/api/auth/google/callback` —
       check your Vercel dashboard for the exact production URL)
   - Click Create. Copy the **Client ID** and **Client secret** — you'll need
     them in step 2.

## 2. Add env vars to Vercel + local

The app reads three env vars from `src/lib/google-auth.ts`:

```
GOOGLE_OAUTH_CLIENT_ID=...              # from step 1
GOOGLE_OAUTH_CLIENT_SECRET=...          # from step 1
GOOGLE_OAUTH_REDIRECT_URI=https://<your-vercel-domain>/api/auth/google/callback
```

### Vercel (production)

```
vercel env add GOOGLE_OAUTH_CLIENT_ID production
vercel env add GOOGLE_OAUTH_CLIENT_SECRET production
vercel env add GOOGLE_OAUTH_REDIRECT_URI production
```

Redeploy after adding them (either push a commit or run `vercel --prod`).

### Local dev (optional)

Add to `.env.local` in the taskpilot-web directory:

```
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## 3. Connect your account

1. Open TaskPilot (prod or localhost) and go to **Profile**.
2. Click **Connect** next to "Google Calendar".
3. Google consent screen opens. Pick `wgates50@gmail.com`. Grant both scopes.
4. Google redirects back to `/?tab=profile&google=connected`. The status row
   should now say **✓ Connected**.

## 4. Verify it works

Go to **Planning → Suggest Now**. Click **📅 Calendar** on any suggestion or
bonus pick. Behaviour should be:

- **Connected path**: no new tab opens; the event appears in your Google
  Calendar within a couple of seconds. Check https://calendar.google.com/.
- **Not-connected fallback**: a one-time alert tells you to connect, then a
  new tab opens with the pre-filled event template (the old behaviour).

## Troubleshooting

- **`412 NOT_CONNECTED` in the browser console** — the server has no tokens.
  Reconnect via Profile.
- **`Redirect URI mismatch` on the Google consent screen** — the URI in step 1
  doesn't exactly match `GOOGLE_OAUTH_REDIRECT_URI`. They must be identical,
  including trailing slashes (there should be none).
- **Access token refresh fails** — delete the row from Postgres and reconnect:
  `DELETE FROM user_context WHERE key = 'google_oauth_tokens';`
- **Tokens expired while in "Testing" mode** — Google expires refresh tokens
  for test-mode apps after 7 days. Either reconnect weekly, or publish the
  app (OAuth consent screen → Publish App). For single-user internal use,
  publishing does not require verification because you're the only user.

## Files touched

- `src/lib/google-auth.ts` — OAuth helpers (auth URL, token exchange, refresh,
  event insert, connection status)
- `src/app/api/auth/google/consent/route.ts` — starts the OAuth flow
- `src/app/api/auth/google/callback/route.ts` — receives the code and persists
  the refresh token
- `src/app/api/auth/google/status/route.ts` — powers the Profile connection
  badge
- `src/app/api/calendar/create/route.ts` — server-side event insert endpoint
- `src/components/PlanningScreen.tsx` — `addToCalendarViaApi` helper + graceful
  URL fallback in `handleAction`, `handleBonusAdd`, `handleEventAction`
- `src/components/ProfileScreen.tsx` — Connect button + success banner

## Why Option A (not URL-templating)

Option A trades ~1 day of setup (this doc + OAuth glue) for instantaneous,
in-place event insertion — no tab-opening, no manual save step, and the same
flow can later be extended to edit/delete events, attach attendees, or pull
free/busy for the Planning engine.
