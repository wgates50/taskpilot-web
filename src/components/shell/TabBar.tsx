'use client';

import { Icon } from '@/components/ui/Icon';
import { TABS, type TabId } from './tabs';

export function TabBar({
  current,
  onSelect,
}: {
  current: TabId;
  onSelect: (t: TabId) => void;
}) {
  return (
    <nav className="tp-tabbar" role="tablist" aria-label="Primary">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={current === t.id}
          className={`tp-tab ${current === t.id ? 'active' : ''}`}
          onClick={() => onSelect(t.id)}
        >
          <span className="tp-tab-ico">
            <Icon name={t.icon} size={18} />
          </span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
