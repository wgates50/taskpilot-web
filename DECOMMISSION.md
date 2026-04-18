# Telegram → TaskPilot Migration

Tracking doc for retiring the Telegram delivery/feedback layer and replacing it with TaskPilot web as the single workflow hub.

**Started:** 2026-04-18
**Owner:** Will
**Status:** In progress

---

## Why

Telegram was the original delivery + feedback channel for every scheduled task. TaskPilot web now covers message delivery (via `/api/messages`), has an iOS-installable PWA with web-push notifications, and has a reply composer per thread. Telegram is now redundant, adds a second place to look for the same information, and locks the feedback loop behind a third-party MCP.

## Scope

**Out of scope:** historical evidence-log entries in `will-profile.md` mentioning Telegram replies. Those are historical facts and stay.

**In scope:** every active send/receive path in the `Scheduled/` skills, the Telegram config rows in `will-profile.md`, the Cowork Telegram MCP connection, and the bot token.

## Critical blockers (must ship before pulling the plug)

These are prerequisites for the skill rewrites. Without them, decommissioning Telegram regresses the feedback loop.

- [x] **Inbound reply endpoint** — extend `/api/messages` with a `GET` that returns user replies for a given `taskId` since a cursor timestamp (`since`), so each skill can harvest feedback on next run. Uses the existing `is_from_user` column — no schema change. Same `verifyClient` auth as POST. Return shape: `{ messages: [{ id, taskId, blocks, timestamp, isFromUser: true }] }`.
- [ ] **Skill rewrites** — replace `get_telegram_messages` reads + `send_telegram_message` calls across all 13 active skills (canonical template: morning-brief)
- [ ] **Ops / failure thread** — a dedicated TaskPilot thread for scheduled-task run failures (API 4xx/5xx, GCal auth errors, Postgres outages). Currently these alerts go to Telegram. Simplest: add a `taskId: "ops"` entry in `TASK_MAP`, and have each skill POST to that thread on caught errors
- [ ] **Lapsed-subscription email fallback** — VAPID push can silently 410 when a device is wiped or the PWA is reinstalled. Detect expired subscriptions in `sendPushNotification` and email Will so he knows to re-open the app

## Skill migration checklist

13 skills touch Telegram today. Migrate in this order (highest-feedback first).

- [x] `morning-brief` (canonical template — reads feedback, sends to Daily topic)
- [ ] `smart-reading-digest` (reads feedback on articles, sends to Daily topic)
- [ ] `finance-tracker` (Finance topic)
- [ ] `monthly-life-admin` (Finance topic, heavy reply parsing)
- [ ] `email-to-calendar` (reply-driven calendar edits)
- [ ] `london-openings-scanner` (Events topic)
- [ ] `weekly-london-event-scanner` (Events topic)
- [ ] `job-alert-scanner` (reply-driven filter adjustments)
- [ ] `visit-review` (weekly check-in replies)
- [ ] `daily-activity-engine` (Daily topic)
- [ ] `data-sync-engine` (status output)
- [ ] `calendar-sync` (status output, minimal Telegram use)
- [ ] `weekly-planner` — already paused; just remove Telegram refs on final pass

**Per-skill migration steps:**
1. Replace `get_telegram_messages` feedback harvest with `GET /api/messages?taskId=<id>&isFromUser=true&since=<lastRun>`
2. Remove all `send_telegram_message` calls (keep the existing POST to `/api/messages`)
3. Route caught errors to the new `ops` thread instead of Telegram
4. Remove references to topic IDs, chat IDs, and Telegram formatting tokens from the skill text

## Clean-up (after all skills migrated)

- [ ] Remove the 5 Telegram rows from `will-profile.md` System Config table (chat ID DM, group chat ID, Daily/Finance/Events topic IDs)
- [ ] Disconnect the Telegram MCP connector in Cowork (UI action, Will to do)
- [ ] Revoke the Telegram bot token via BotFather (Will to do)
- [ ] Delete any unused Telegram bot helpers in scheduled-task scripts (if any)

## PWA polish (needed once Telegram gone)

These don't block decommission but will hurt once Telegram isn't the escape hatch.

- [ ] Add `/public/icon-192.png`, `/public/icon-512.png`, `/public/apple-touch-icon.png` — manifest and layout reference them; without them iOS uses a screenshot as the home-screen icon
- [ ] Once icons exist, re-enable `icon:` and `badge:` in `sw.js` notification options (currently stripped because files missing)
- [ ] Add a re-prompt UI for notification permission — `page.tsx` asks exactly once on mount; if Will denies or the sub expires there's no second-chance banner
- [ ] Confirm `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` are set on Vercel prod (not just `.env.local`)
- [ ] Implement offline caching in `sw.js` (the file comment claims it but only push is implemented)
- [ ] Silent-push heartbeat to detect dead subscriptions, paired with the email fallback above

## Nice-to-haves (park for later)

- [ ] Structured card actions (`Book`, `Dismiss`, `Save`, `Already went`) with a single `/api/actions` endpoint instead of Claude reparsing free-text
- [ ] Per-task curated `quickReplies` lists (UI already renders them from `task.quickReplies`)
- [ ] Message search + pagination (Telegram had infinite scroll)
- [ ] Task-run dashboard surfacing last-run-status from a new `task_runs` table
- [ ] Image/file block type (if any brief needs attachments)

## Rollback

If push delivery is unreliable in the first week:

1. Don't revert the code — keep the GET endpoint and skill rewrites
2. Re-enable `send_telegram_message` as a secondary channel in morning-brief + finance-tracker only (highest-stakes tasks)
3. Leave everything else on TaskPilot-only
4. Once push is stable, strip Telegram again

Do not re-add Telegram as the feedback-read channel — the feedback rewrite is the higher-value half of this migration.
