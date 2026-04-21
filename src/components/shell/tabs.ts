import type { IconName } from '@/components/ui/Icon';

export type TabId = 'brief' | 'calendar' | 'fitness' | 'unesco' | 'reading' | 'settings';

export interface TabDef {
  id: TabId;
  label: string;
  icon: IconName;
  kbd: string;
}

export const TABS: TabDef[] = [
  { id: 'brief',    label: 'Brief',    icon: 'sparkle',  kbd: '1' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar', kbd: '2' },
  { id: 'fitness',  label: 'Fitness',  icon: 'activity', kbd: '3' },
  { id: 'unesco',   label: 'UNESCO',   icon: 'globe',    kbd: '4' },
  { id: 'reading',  label: 'Reading',  icon: 'book',     kbd: '5' },
  { id: 'settings', label: 'Settings', icon: 'settings', kbd: '6' },
];
