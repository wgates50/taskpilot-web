// Static task metadata — lives in code, not the database.
// The database only stores messages and user preferences (pins).

export interface TaskMeta {
  id: string;
  name: string;
  icon: string;
  description: string;
  schedule: string;
  cronExpression: string;
  group: 'calendar' | 'reading' | 'finance' | 'career' | 'activity';
  tier: 'main' | 'background';
  dependencies: string[];
  dependents: string[];
  quickReplies: string[];
  retired?: boolean;
  /**
   * If true, task still runs on its cron but does NOT appear in the Threads tab.
   * Used for engines whose output surfaces elsewhere (e.g. daily-activity-engine
   * writes to the suggestions table → Planning tab, not /api/messages).
   */
  hideFromThreads?: boolean;
}

export const TASKS: TaskMeta[] = [
  {
    id: 'morning-brief',
    name: 'Morning Brief',
    icon: '\u2600\uFE0F',
    description: 'Daily smart morning brief \u2014 weather, calendar, activity picks, work tasks, email scan',
    schedule: 'Every day at 6:00 AM',
    cronExpression: '0 6 * * *',
    group: 'calendar',
    tier: 'main',
    dependencies: ['email-to-calendar', 'daily-activity-engine', 'data-sync-engine'],
    dependents: [],
    quickReplies: ['Add to calendar', 'Not interested', 'Already booked', 'Tell me more'],
  },
  {
    id: 'smart-reading-digest',
    name: 'Reading Digest',
    icon: '\uD83D\uDCDA',
    description: 'Daily lunchtime reading digest \u2014 newsletters, web search, adaptive click-tracking',
    schedule: 'Every day at 12:00 PM',
    cronExpression: '0 12 * * *',
    group: 'reading',
    tier: 'main',
    dependencies: [],
    dependents: ['monthly-life-admin'],
    quickReplies: ['\uD83D\uDC4D', '\uD83D\uDC4E', 'Save for later', 'More like this'],
  },
  {
    id: 'daily-activity-engine',
    name: 'Activity Engine',
    icon: '\u2728',
    description: 'Daily activity suggestions — scores places + events using weather, calendar, location, companions',
    schedule: 'Every day at 2:00 AM',
    cronExpression: '0 2 * * *',
    group: 'activity',
    tier: 'main',
    dependencies: ['data-sync-engine'],
    dependents: ['morning-brief', 'weekly-planner'],
    quickReplies: ['Sounds good!', 'Not today', 'Save for weekend', 'Show alternatives'],
    // Output lives in the Planning tab (suggestions table), not /api/messages —
    // hide the dead thread that this task would otherwise create.
    hideFromThreads: true,
  },
  {
    id: 'finance-tracker',
    name: 'Finance Tracker',
    icon: '\uD83D\uDCB0',
    description: 'Weekly finance summary \u2014 spending, categories, anomalies, savings',
    schedule: 'Sundays at 7 PM',
    cronExpression: '0 19 * * 0',
    group: 'finance',
    tier: 'main',
    dependencies: [],
    dependents: ['monthly-life-admin'],
    quickReplies: ['Recategorise', 'Flag transaction', 'Looks right', 'Show subscriptions'],
  },
  {
    id: 'weekly-planner',
    name: 'Weekly Planner',
    icon: '\uD83D\uDDD3\uFE0F',
    description: 'Sunday evening week-ahead planner \u2014 calendar review, activity engine suggestions, Asana preview',
    schedule: 'Sundays at 2 PM',
    cronExpression: '0 14 * * 0',
    group: 'calendar',
    tier: 'main',
    dependencies: ['daily-activity-engine', 'data-sync-engine', 'email-to-calendar'],
    dependents: [],
    quickReplies: ['Looks good', 'Too busy', 'Add suggestion', 'Move event'],
  },
  {
    id: 'job-alert-scanner',
    name: 'Job Alerts',
    icon: '\uD83D\uDCBC',
    description: 'Weekly job digest \u2014 data centre roles in LA/Austin',
    schedule: 'Sundays at 10 AM',
    cronExpression: '0 10 * * 0',
    group: 'career',
    tier: 'main',
    dependencies: [],
    dependents: [],
    quickReplies: ['Apply', 'Save', 'Not relevant', 'More like this'],
  },
  // --- Retired tasks (still visible for message history) ---
  {
    id: 'activity-suggester',
    name: 'Activity Suggester (v2)',
    icon: '\uD83C\uDFAF',
    description: 'Legacy — 10 fixed venues scored against weather + calendar. Replaced by Activity Engine.',
    schedule: 'Retired',
    cronExpression: '',
    group: 'activity',
    tier: 'background',
    dependencies: [],
    dependents: [],
    quickReplies: ['Sounds good!', 'Not today'],
    retired: true,
  },
  // --- Background tasks ---
  {
    id: 'email-to-calendar',
    name: 'Email \u2192 Calendar',
    icon: '\uD83D\uDCE7',
    description: 'Daily morning email scan \u2014 finds events and tickets in Gmail, adds to calendar',
    schedule: 'Every day at 5 AM',
    cronExpression: '0 5 * * *',
    group: 'calendar',
    tier: 'background',
    dependencies: [],
    dependents: ['morning-brief', 'weekly-planner'],
    quickReplies: ['Undo', 'Confirm', 'Wrong calendar', 'Looks good'],
  },
  {
    id: 'data-sync-engine',
    name: 'Data Sync',
    icon: '\uD83D\uDD04',
    description: 'Weekly sync — Google Maps import, enrichment, event scan, Notion \u2194 Postgres sync',
    schedule: 'Sundays at midnight',
    cronExpression: '0 0 * * 0',
    group: 'activity',
    tier: 'background',
    dependencies: [],
    dependents: ['daily-activity-engine', 'morning-brief', 'weekly-planner'],
    quickReplies: ['Show new places', 'Show new events', 'Sync stats'],
  },
  {
    id: 'visit-review',
    name: 'Visit Review',
    icon: '\uD83D\uDCCB',
    description: 'Weekly check-in — did you visit these places? Mark as liked to re-suggest',
    schedule: 'Fridays at 7 PM',
    cronExpression: '0 19 * * 5',
    group: 'activity',
    tier: 'background',
    dependencies: ['daily-activity-engine'],
    dependents: [],
    quickReplies: ['Visited', 'Didn\'t go', 'Go again'],
  },
  {
    id: 'london-openings-scanner',
    name: 'London Openings',
    icon: '\uD83C\uDF1F',
    description: 'Weekly scan of new London openings \u2014 restaurants, cafes, retail, pop-ups',
    schedule: 'Tuesdays at 9 AM',
    cronExpression: '0 9 * * 2',
    group: 'calendar',
    tier: 'background',
    dependencies: [],
    dependents: ['morning-brief', 'daily-activity-engine'],
    quickReplies: ['Add to calendar', 'Save for later', 'Been already'],
  },
  {
    id: 'monthly-life-admin',
    name: 'Monthly Admin',
    icon: '\uD83D\uDCCB',
    description: 'Monthly life admin check-in \u2014 finance, events, reading, Vinted, subscriptions',
    schedule: '1st of each month at 10 AM',
    cronExpression: '0 10 1 * *',
    group: 'finance',
    tier: 'background',
    dependencies: ['finance-tracker', 'smart-reading-digest'],
    dependents: [],
    quickReplies: ['Looks right', 'Cancel subscription', 'Flag issue'],
  },
];

export const TASK_MAP = Object.fromEntries(TASKS.map(t => [t.id, t]));

export const TASK_GROUPS: Record<string, { name: string; color: string }> = {
  calendar: { name: 'Calendar Pipeline', color: '#3B82F6' },
  activity: { name: 'Activity Engine', color: '#EC4899' },
  reading: { name: 'Reading Pipeline', color: '#8B5CF6' },
  finance: { name: 'Finance Pipeline', color: '#10B981' },
  career: { name: 'Career', color: '#F59E0B' },
};
