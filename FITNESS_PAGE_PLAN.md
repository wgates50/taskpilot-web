# Fitness Page — Plan

Wave 3 build-out for the currently-stubbed **Fitness** tab. The goal: a page
that shows real recovery / sleep / workout data next to the same goal-mode
toggle from the design (Gain / Lean / Maintain), pulling from a wearable the
user is actually wearing. Authentication by **login link**, not background
`.env` API keys — the user should be able to connect and disconnect from
Settings like they do with Google Calendar today.

## What "login link, not env key" means here

TaskPilot already does this for Google Calendar (see `src/lib/google-auth.ts`,
`src/app/api/auth/google/*`). The shape is:

1. User clicks **Connect** in Settings → we redirect to the provider's
   OAuth consent screen.
2. Provider redirects back to `/api/auth/<provider>/callback?code=…`.
3. We exchange the code for a `{ access_token, refresh_token, expires_at }`
   bundle and store it in the `user_context` table.
4. Subsequent API calls refresh the access token when expired and query the
   provider's REST API.

**`.env` still holds a `CLIENT_ID` / `CLIENT_SECRET`**, but those are *app*
credentials — not per-user API keys. The user never pastes a token. That's
the pattern we want to copy for Fitness.

## Provider options, ranked by fit

### 1. Whoop — **recommended primary**

- Public developer platform: https://developer.whoop.com
- OAuth 2.0 Authorization Code flow — same shape as our existing Google flow.
- Scopes we'd ask for: `read:recovery`, `read:sleep`, `read:workout`,
  `read:cycles`, `read:profile`, `read:body_measurement`, `offline`.
- REST endpoints we'd use:
  - `GET /developer/v1/cycle` — daily cycles (strain, avg HR, max HR, kJ)
  - `GET /developer/v1/recovery` — recovery score (HRV, RHR, skin temp)
  - `GET /developer/v1/activity/sleep` — last night's sleep perf / debt
  - `GET /developer/v1/activity/workout` — logged workouts
  - `GET /developer/v1/user/profile/basic` — name / email for display
- Refresh tokens are long-lived; mirror the `StoredTokens` struct from
  `google-auth.ts`.
- **Webhooks** are available (cycle updated, recovery updated, sleep
  updated, workout updated) — worth wiring so the Brief can pick up fresh
  data without polling.

Why primary: Will wears one, it has the cleanest single-user OAuth, and it
covers the three metrics the Fitness tab is built around (recovery, sleep,
workouts).

### 2. Apple HealthKit — **not directly integrable from a web app**

Apple Health data lives in iOS. There is **no web API**. The realistic
options are:

- **(a) Aggregator as a middleware** — Terra (tryterra.co), Vital
  (tryvital.io), or Rook. Each gives you a single OAuth-like flow that,
  under the hood, has the user install their small iOS companion app which
  reads HealthKit and syncs to the aggregator. Our server then calls
  *Terra/Vital's* REST API with `user_id`. It matches the "login link"
  constraint — Will never pastes an API key — but introduces a third-party
  dependency and (for Terra/Vital) a paid plan beyond the free tier.
- **(b) Manual export upload** — Apple Health lets the user export a zip
  containing `export.xml`. We'd add a drop-zone on `/fitness` that parses
  the XML and bulk-inserts into Postgres. One-off, not live, but zero
  vendor cost and zero extra integration surface.
- **(c) Native iOS companion** — build a tiny SwiftUI app that reads
  HealthKit and POSTs to `/api/fitness/ingest`. Biggest engineering lift;
  skip unless we decide to ship a real iOS app anyway.

Recommendation: **don't block the Fitness page on HealthKit.** Ship Whoop
first, add Apple Health import (manual zip upload) as a secondary phase if
Whoop doesn't cover the data we want. Only introduce Terra/Vital if we
find a specific metric Whoop doesn't give us.

### 3. Other providers worth knowing

- **Oura** — clean OAuth, excellent sleep/readiness, useful if Will
  switches off Whoop.
- **Strava** — OAuth, workout-only, great if running/cycling matters.
- **Fitbit** — OAuth, broad but declining.
- **Garmin Connect** — requires a long developer-program approval; skip
  unless specifically needed.

The design we'll build makes the connected provider a setting — swapping
Whoop for Oura later shouldn't require a page rewrite.

## Architecture

### New directories / files

```
src/lib/
  whoop-auth.ts              # mirrors google-auth.ts: consent URL, token
                             # exchange, refresh, authed fetch helper
  fitness.ts                 # normalises Whoop payloads → TaskPilot's
                             # FitnessDay / FitnessWorkout shape

src/app/api/
  auth/whoop/
    consent/route.ts         # GET  → redirect to Whoop consent
    callback/route.ts        # GET  → exchange code, store tokens, redirect /settings
    status/route.ts          # GET  → { connected: boolean, lastSync?: ISO }
    disconnect/route.ts      # POST → wipe tokens
  fitness/
    sync/route.ts            # POST → pull last N days of Whoop data, upsert
    day/[date]/route.ts      # GET  → one day's metrics from Postgres
    range/route.ts           # GET  → summary over ?from=…&to=…
    webhook/route.ts         # POST → Whoop webhook receiver (optional, phase 2)

src/components/
  FitnessScreen.tsx          # replaces ComingSoon stub in page.tsx
  cards/
    RecoveryRing.tsx         # big today-card: recovery % + HRV trend
    StrainBar.tsx            # day strain vs 7d avg
    SleepCard.tsx            # last night's hours + sleep perf
    WorkoutList.tsx          # recent workouts
    GoalModeToggle.tsx       # Gain / Lean / Maintain (already in design HTML)
    ConnectWhoopCard.tsx     # shown when disconnected
```

### Postgres additions (`src/lib/schema.sql`)

```sql
-- daily roll-up, one row per user per day
CREATE TABLE IF NOT EXISTS fitness_day (
  day DATE PRIMARY KEY,
  source TEXT NOT NULL,              -- 'whoop' | 'oura' | 'apple_health'
  recovery_score INTEGER,            -- 0-100
  hrv_ms DOUBLE PRECISION,
  resting_hr INTEGER,
  skin_temp_c DOUBLE PRECISION,
  strain DOUBLE PRECISION,           -- 0-21 on Whoop's scale
  sleep_minutes INTEGER,
  sleep_performance INTEGER,         -- 0-100
  raw_json JSONB,                    -- full provider payload for debugging
  synced_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fitness_day_source ON fitness_day(source);

-- one row per workout
CREATE TABLE IF NOT EXISTS fitness_workout (
  id TEXT PRIMARY KEY,               -- provider's id, prefixed (whoop_…)
  source TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  sport_name TEXT,
  strain DOUBLE PRECISION,
  avg_hr INTEGER,
  max_hr INTEGER,
  kilojoules DOUBLE PRECISION,
  raw_json JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fitness_workout_started ON fitness_workout(started_at DESC);

-- goal mode lives in the existing profile / user_context row; no new table
```

Tokens keep living in `user_context` (key: `whoop_oauth_tokens`) — same
pattern as `google_oauth_tokens`.

### Env vars (added to `.env.local` and Vercel)

```
WHOOP_CLIENT_ID=…
WHOOP_CLIENT_SECRET=…
WHOOP_REDIRECT_URI=https://taskpilot-web.vercel.app/api/auth/whoop/callback
```

A parallel setup doc (`WHOOP_OAUTH_SETUP.md`) will walk the user through
creating a client at developer.whoop.com — same shape as the existing
`GOOGLE_OAUTH_SETUP.md`. The only per-user action is clicking **Connect
Whoop** in Settings.

## Fitness page UI — what Will sees

Layout mirrors the popout-card feel from the post-#34 Brief tab. Mobile-first,
stacks to single column under ~640px.

```
┌────────────────────────────────────────────────────┐
│ Fitness                           [Whoop · synced] │   ← header w/ connection pill
├────────────────────────────────────────────────────┤
│ ┌──── Recovery ──────────┐  ┌─── Today's strain ─┐ │
│ │   ◯ 72%   "Yellow"    │  │   12.4 / 21        │ │
│ │   HRV 58ms · RHR 52   │  │   7d avg: 11.1     │ │
│ └───────────────────────┘  └─────────────────────┘ │
│ ┌──── Last night ───────────────────────────────┐  │
│ │  7h 42m · 88% performance · 0:34 sleep debt   │  │
│ │  ▁▂▅▇▆▃▂  (hypnogram sparkline, optional)    │  │
│ └───────────────────────────────────────────────┘  │
│ ┌──── Goal mode ────────────────────────────────┐  │
│ │  [ Gain ]  [ Lean ]   (Maintain)              │  │
│ │  Calories target: 2,650  ·  Protein: 165g     │  │
│ └───────────────────────────────────────────────┘  │
│ ┌──── Recent workouts ──────────────────────────┐  │
│ │  Tue  Running     42m · strain 11.2 · 168bpm  │  │
│ │  Mon  Strength    58m · strain 13.4 · 142bpm  │  │
│ │  Sun  Walk        25m · strain 4.1  · 108bpm  │  │
│ │                                 [See all →]   │  │
│ └───────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

**Empty / disconnected state** (when `whoop_oauth_tokens` is absent):

```
┌──── Connect a wearable ────────────────────────────┐
│  TaskPilot shows your recovery, sleep, and         │
│  workouts next to the rest of your day.            │
│                                                    │
│  [ Connect Whoop ]        Other providers →        │
└────────────────────────────────────────────────────┘
```

Clicking **Connect Whoop** opens `/api/auth/whoop/consent`, which redirects
to Whoop's consent screen; callback returns to the Fitness page with
`?connected=whoop`. No tokens ever touch the browser.

## Phased build

Concrete slices so each ship is committable and useful. Each phase is
expected to land on `redesign/linear-things-direction` the same way prior
waves have.

### Phase F1 — Whoop OAuth plumbing (no UI yet)

1. `WHOOP_OAUTH_SETUP.md` — step-by-step client creation at
   developer.whoop.com, redirect URIs, scopes.
2. `src/lib/whoop-auth.ts` mirroring `google-auth.ts`:
   `getAuthUrl`, `exchangeCode`, `getAccessToken` (with refresh), `whoopFetch`.
3. `/api/auth/whoop/consent` and `/api/auth/whoop/callback` routes.
4. `/api/auth/whoop/status` and `/api/auth/whoop/disconnect`.
5. Settings tile: **Whoop — connect / connected since …**, mirroring the
   existing Google Calendar tile in `ProfileScreen.tsx`.

Acceptance: Will can click Connect in Settings, consent, return, see
"Whoop connected", and disconnect again.

### Phase F2 — Data schema + sync

1. Add `fitness_day` and `fitness_workout` to `schema.sql`; migration
   executed against Vercel Postgres.
2. `src/lib/fitness.ts` — normalisers converting Whoop payloads →
   `FitnessDay` / `FitnessWorkout`.
3. `/api/fitness/sync` — pulls last 14 days of cycles / recovery / sleep /
   workouts, upserts both tables. Called on first connect + nightly from a
   scheduled task.
4. `/api/fitness/day/[date]` and `/api/fitness/range` read endpoints.

Acceptance: calling `/api/fitness/sync` after connecting fills the
`fitness_day` and `fitness_workout` tables with real Whoop data.

### Phase F3 — Fitness page UI

1. Replace the `ComingSoon` stub in `page.tsx` with `<FitnessScreen />`.
2. Build `RecoveryRing`, `StrainBar`, `SleepCard`, `WorkoutList`, and
   `ConnectWhoopCard`. All use `.tp-card.popout`.
3. `GoalModeToggle` reads/writes `profile.goal_mode` (add column,
   `'gain' | 'lean' | 'maintain'`).
4. Disconnected state renders `ConnectWhoopCard`; connected state renders
   the five cards above.

Acceptance: `/fitness` in the Wave-2 dev build shows today's recovery,
strain, sleep, and last 7 days of workouts, pulling from Postgres.

### Phase F4 — Brief integration + automation

1. Extend the Brief with an `inbox_item`-style `fitness_snapshot` block
   (recovery %, sleep hours, a one-line nudge like "Yellow recovery — ease
   off high-strain today"). Rendered as a popout in the Brief.
2. Update the `morning-brief` SKILL to call `/api/fitness/day/:today` and
   emit the block.
3. Add `/api/fitness/webhook` (Whoop webhook receiver) so fresh data
   lands before the Brief runs — no polling lag.

Acceptance: morning Brief shows the day's recovery + a one-line nudge
without a manual refresh.

### Phase F5 — Apple Health import (optional)

1. Add `/fitness/import` dropzone + `/api/fitness/import` handler that
   parses an Apple Health `export.xml`.
2. Map Health record types to `fitness_day` (HKQuantityTypeIdentifier-
   RestingHeartRate, HKCategoryTypeIdentifierSleepAnalysis, etc.).
3. Merge / dedupe against Whoop rows using `source = 'apple_health'`.

Skip this phase unless we hit a specific metric Whoop doesn't provide.

## Open questions to resolve before Phase F1

1. **Whoop developer application.** Whoop's platform requires registering
   an app and getting a Client ID / Secret. The flow is self-serve for
   personal use but production-scale distribution requires review. For
   single-user TaskPilot that's not an issue — we just need Will to create
   the app under his Whoop account. Link:
   https://developer.whoop.com/docs/developing/getting-started
2. **Goal-mode logic — what actually changes when Will picks Lean vs
   Gain?** Calorie target, protein target, and the Brief nudge copy are
   the visible outputs. We need a small constants table or formula.
   Proposal: `maintain = Mifflin-St Jeor × activity`, `lean = maintain −
   400`, `gain = maintain + 300`. Protein 1.6 g/kg across modes, higher on
   Gain/Lean. Confirm before F3.
3. **Sync cadence.** Webhooks (F4) are cleanest, but we can ship without
   them if we call `/api/fitness/sync` at the start of the morning-brief
   scheduled task. Which to do first depends on how fresh Will wants the
   Brief's fitness_snapshot block.
4. **Secondary provider scope.** Do we want to explicitly design for
   **multi-provider** (Whoop + Oura + Apple Health all active, merged by
   day) on day one, or is **single-source-at-a-time** fine? The schema
   supports either; the UI is simpler for single-source. Recommendation:
   single-source for F1–F4, multi-source as a later enhancement.

## Risks / gotchas

- **Whoop token revocation.** If Will disconnects in the Whoop app, our
  refresh will 400. The sync route should catch this and null out the
  tokens so Settings shows the disconnected state automatically.
- **Rate limits.** Whoop limits to ~100 req/min per user. The sync
  endpoint paginates `cycle`/`recovery`/`sleep`/`workout` — at worst a
  14-day backfill is ~8 requests, well under the ceiling. Webhooks don't
  count toward the quota.
- **Timezone.** Whoop returns ISO-8601 with UTC offset; `fitness_day.day`
  should be the user's local date at the start of the cycle, not the UTC
  date. Use `profile.timezone` (already set by Wave 2 auto-detect).
- **Apple Health export size.** Full export can be 100–500 MB. The
  dropzone handler should stream-parse (`@xml/sax` or similar) rather
  than loading the XML into memory.

## Summary — what to ship first

Three work items worth tracking as separate tasks:

- **F1 Whoop OAuth plumbing** (routes + Settings tile + setup doc).
- **F2 Data schema + sync route** (tables + normalisers + `/api/fitness/sync`).
- **F3 Fitness page UI** (replace ComingSoon, build the five cards + goal mode).

F4 (Brief integration) and F5 (Apple Health import) get scoped once F1–F3
are live.
