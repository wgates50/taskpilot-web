'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Direction = 'linear' | 'things' | 'current';
export type Accent = 'indigo' | 'rust' | 'forest' | 'graphite';
export type Density = 'default' | 'comfortable' | 'compact';
export type Theme = 'light' | 'dark';

export interface Preferences {
  direction: Direction;
  accent: Accent;
  density: Density;
  theme: Theme;
}

const DEFAULT_PREFS: Preferences = {
  direction: 'linear',
  accent: 'indigo',
  density: 'default',
  theme: 'light',
};

const STORAGE_KEY = 'tp-prefs';

interface Ctx extends Preferences {
  setDirection: (d: Direction) => void;
  setAccent: (a: Accent) => void;
  setDensity: (d: Density) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const PreferencesContext = createContext<Ctx | null>(null);

function applyAttributes(p: Preferences) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.dataset.direction = p.direction;
  el.dataset.accent = p.accent;
  el.dataset.density = p.density;
  el.dataset.theme = p.theme;
  el.style.colorScheme = p.theme;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

  // Hydrate once on mount. Reading localStorage must happen in an effect
  // because it's unavailable during SSR.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Preferences>;
        const next = { ...DEFAULT_PREFS, ...parsed };
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPrefs(next);
        applyAttributes(next);
        return;
      }
    } catch {
      /* ignore */
    }
    applyAttributes(DEFAULT_PREFS);
  }, []);

  // Persist + apply whenever prefs change
  useEffect(() => {
    applyAttributes(prefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const value: Ctx = {
    ...prefs,
    setDirection: (direction) => setPrefs((p) => ({ ...p, direction })),
    setAccent: (accent) => setPrefs((p) => ({ ...p, accent })),
    setDensity: (density) => setPrefs((p) => ({ ...p, density })),
    setTheme: (theme) => setPrefs((p) => ({ ...p, theme })),
    toggleTheme: () => setPrefs((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' })),
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Ctx {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
