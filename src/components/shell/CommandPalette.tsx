'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { TABS, type TabId } from './tabs';
import {
  usePreferences,
  type Direction,
  type Accent,
} from '@/components/providers/PreferencesProvider';

export interface PaletteAction {
  id: string;
  label: string;
  group: string;
  icon?: IconName;
  kbd?: string;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onSelectTab,
}: {
  open: boolean;
  onClose: () => void;
  onSelectTab: (t: TabId) => void;
}) {
  const prefs = usePreferences();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);

  const actions: PaletteAction[] = useMemo(() => {
    const tabActions: PaletteAction[] = TABS.map((t) => ({
      id: `tab:${t.id}`,
      label: `Go to ${t.label}`,
      group: 'Navigate',
      icon: t.icon,
      kbd: t.kbd,
      run: () => {
        onSelectTab(t.id);
      },
    }));
    const directions: Direction[] = ['linear', 'things', 'current'];
    const dirActions: PaletteAction[] = directions.map((d) => ({
      id: `dir:${d}`,
      label: `Aesthetic: ${d[0].toUpperCase() + d.slice(1)}`,
      group: 'Preferences',
      icon: 'slash',
      run: () => prefs.setDirection(d),
    }));
    const accents: Accent[] = ['indigo', 'rust', 'forest', 'graphite'];
    const accentActions: PaletteAction[] = accents.map((a) => ({
      id: `acc:${a}`,
      label: `Accent: ${a[0].toUpperCase() + a.slice(1)}`,
      group: 'Preferences',
      icon: 'star',
      run: () => prefs.setAccent(a),
    }));
    const themeAction: PaletteAction = {
      id: 'theme:toggle',
      label: `Toggle theme (${prefs.theme === 'dark' ? 'light' : 'dark'})`,
      group: 'Preferences',
      icon: prefs.theme === 'dark' ? 'sun' : 'moon',
      run: () => prefs.toggleTheme(),
    };
    return [...tabActions, themeAction, ...dirActions, ...accentActions];
  }, [prefs, onSelectTab]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(needle) ||
        a.group.toLowerCase().includes(needle),
    );
  }, [q, actions]);

  // Reset palette state when it opens, then focus the input.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQ('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Reset cursor when the query changes so results start at the top.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCursor(0);
  }, [q]);

  if (!open) return null;

  const run = (a: PaletteAction) => {
    a.run();
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      const a = filtered[cursor];
      if (a) run(a);
    }
  };

  return (
    <div
      className="tp-palette-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tp-palette" role="dialog" aria-label="Command palette" onKeyDown={onKey}>
        <input
          ref={inputRef}
          className="tp-palette-input"
          placeholder="Type a command or search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search commands"
        />
        <div className="tp-palette-list">
          {filtered.map((a, i) => (
            <button
              key={a.id}
              type="button"
              className={`tp-palette-item ${i === cursor ? 'active' : ''}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => run(a)}
            >
              {a.icon && <Icon name={a.icon} size={15} />}
              <span>{a.label}</span>
              <span className="tp-palette-group">{a.group}</span>
              {a.kbd && <span className="tp-kbd" style={{ marginLeft: 8 }}>{a.kbd}</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 16, color: 'var(--text-3)', fontSize: 13 }}>No matches.</div>
          )}
        </div>
      </div>
    </div>
  );
}
