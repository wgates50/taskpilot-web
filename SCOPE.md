# TaskPilot — Scope

Living planning doc. Last updated: 2026-04-11.

## Vision

TaskPilot is a personal AI task automation hub — a mobile-first PWA that turns inbound signals (email, calendar, weather, location, newsletters) into a curated daily brief and actionable suggestions. The aesthetic target is Linear / Things 3: calm, typographic, no emoji clutter. Core loop: ingest → score → surface → capture feedback → improve next round.

## Currently Building

Parallel code tasks in flight:

1. **Typography & emoji cleanup** — strip all emoji from the UI, refine spacing/weights toward Linear/Things 3.
2. **Desktop responsive layout** — unlock the 430px mobile-only container so the app is usable on desktop.
3. **Tab restructure** — split the single Threads view into three tabs: **Threads** (briefs/digests), **Events** (event scanner + activity suggester + weekly planner unified), and a new **Calendar** tab.
4. **Morning brief rotation tracking** — new `shown_items` and `interactions` tables so items don't repeat, and engagement signals feed back into future suggestions. Includes venue status tracking (closed / wrong-day flags).
5. **Weekly planner data fixes** — remove permanently closed venues (Dalston Roof Park), fix day-of-week errors (Columbia Flower Market is Sunday only), add booking URLs and map links to every suggestion.
6. **Google Calendar integration** — wire the "Add to Calendar" button to actually create events; render Google Calendar events inside the new Calendar tab.
7. **UNESCO World Heritage tracker** — new section with ~1,200 sites seeded, visited toggle, progress counter, filters, map view. Goal: visit as many as possible.
8. **"Didn't go" marker** — Went / Didn't go buttons on past calendar events, feeding the interaction tracking table.
9. **Calendar tab — 3 modes** — Personal Calendar / What's On Calendar / Planner, as three views within the Calendar tab.

## Recently Shipped

- Budget dashboard deployed to `budget-dashboard-two.vercel.app` with localStorage persistence.
- Weekly planner redesigned from chat bubbles to calendar grid.
- Activity suggester running on schedule at 8am / 4pm with weather + time-of-day scoring.
- Email-to-calendar task auto-adding London events from Gmail newsletters.
- Event cards enriched with maps, photos, categories, booking URLs.
- `EmailCard` component for structured email item rendering.
- David Bowie expo date fixed; duplicate messages cleared.

## Backlog

- **Saved items persistence** — `/api/saved` endpoint, `saved_items` table. Hybrid approach using Google Maps deep links since no public Google Lists API exists.
- **LinkedIn job alerts** — setup pending; requires the Chrome extension.
- **DICM financial model UI.**
- **Google Maps taste profile full sync** — 761 places to ingest.
- **Visual verification pass** — screenshot audit of all thread types.

## Architecture Notes

- Next.js app (App Router) deployed on Vercel at `taskpilot-web.vercel.app`.
- Mobile-first PWA; currently constrained to a 430px container (being lifted — see Currently Building #2).
- Scheduled activity suggester runs twice daily (8am / 4pm) with weather and time-of-day scoring.
- Interaction / rotation data will live in `shown_items` and `interactions` tables; venue status flags (closed, wrong-day) live alongside.
- External integrations: Gmail (event ingestion), Google Calendar (read + write, in progress), Google Maps (deep links for saved items, full taste-profile sync pending).
- Sibling app: budget dashboard at `budget-dashboard-two.vercel.app` (localStorage-only for now).
