'use client';

import { Icon } from '@/components/ui/Icon';
import { TABS, type TabId } from './tabs';

export function Sidebar({
  current,
  onSelect,
  onOpenTweaks,
  userName,
  userEmail,
}: {
  current: TabId;
  onSelect: (t: TabId) => void;
  onOpenTweaks: () => void;
  userName?: string;
  userEmail?: string;
}) {
  const avatarInitials = (userName || 'W').slice(0, 2).toUpperCase();
  return (
    <aside className="tp-sidebar">
      <div className="tp-brand">
        <div className="tp-brand-mark">TP</div>
        <div className="tp-brand-name">TaskPilot</div>
        <div className="tp-brand-sub">v2</div>
      </div>

      <div className="tp-nav-label">Workspaces</div>
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tp-nav-item ${current === t.id ? 'active' : ''}`}
          onClick={() => onSelect(t.id)}
          aria-current={current === t.id}
        >
          <Icon name={t.icon} size={15} />
          <span>{t.label}</span>
          <span className="kbd">{t.kbd}</span>
        </button>
      ))}

      <div className="tp-sidebar-footer">
        <button
          type="button"
          className="tp-nav-item"
          onClick={onOpenTweaks}
          aria-label="Open preferences"
        >
          <Icon name="settings" size={15} />
          <span>Tweaks</span>
          <span className="kbd">,</span>
        </button>
        <div className="tp-user-row">
          <div className="tp-avatar">{avatarInitials}</div>
          <div>
            <div className="tp-user-name">{userName || 'Will'}</div>
            <div className="tp-user-email">{userEmail || ''}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
