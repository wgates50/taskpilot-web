// Static task metadata — lives in code, not the database.
// The database only stores messages and user preferences (pins).

export interface TaskMeta {
  id: string;
  name: string;
  icon: string;
  description: string;
  schedule: string;
  cronExpression: string;
  group: 'calendar' | 'reading' | 'finance' | 'career';
  tier: 'main' | 'background';
  dependencies: string[];
  dependents: string[];
  quickReplies: string[];
}

export const TASKS: TaskMeta[] = [
  {
    id: 'morning-brief',
    name: 'Morning Brief',
    icon: '\u2600\uFE0F',
    description: 'Daily smart morning brief \u2014 weather, calendar, What\u2019s On picks, work tasks, email scan',
    schedule: 'Every day at 6:00 AM',
    cronExpression: '0 6 * * *',
    group: 'calendar',
    tier: 'main',
    dependencies: ['email-to-calendar', 'weekly-london-event-scanner', 'london-openings-scanner'],
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
    id: 'activity-suggester',
    name: 'Activity Suggester',
    icon: '\uD83D\uDCA1',
    description: 'Smart place suggestions based on weather, calendar, and taste profile',
    schedule: 'Every day at 8 AM & 4 PM',
    cronExpression: '0 8,16 * * *',
    group: 'calendar',
    tier: 'main',
    dependencies: ['weekly-london-event-scanner', 'london-openings-scanner'],
    dependents: [],
    quickReplies: ['Sounds good!', 'Not today', 'Save for weekend', 'Show on map'],
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
    description: 'Sunday evening week-ahead planner \u2014 calendar review, suggestions, Asana preview',
    schedule: 'Sundays at 2 PM',
    cronExpression: '0 14 * * 0',
    group: 'calendar',
    tier: 'main',
    dependencies: ['weekly-london-event-scanner', 'london-openings-scanner', 'email-to-calendar'],
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
    id: 'weekly-london-event-scanner',
    name: 'Event Scanner',
    icon: '\uD83C\uDFAD',
    description: 'Weekly scan of London events \u2014 4-week horizon, added to What\u2019s On calendar',
    schedule: 'Wednesdays at 8 AM',
    cronExpression: '0 8 * * 3',
    group: 'calendar',
    tier: 'background',
    dependencies: [],
    dependents: ['morning-brief', 'activity-suggester', 'weekly-planner'],
    quickReplies: ['Add to calendar', 'Not interested', 'Looks great'],
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
    dependents: ['morning-brief', 'activity-suggester'],
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
  reading: { name: 'Reading Pipeline', color: '#8B5CF6' },
  finance: { name: 'Finance Pipeline', color: '#10B981' },
  career: { name: 'Career', color: '#F59E0B' },
};
