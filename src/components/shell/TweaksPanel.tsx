'use client';

import { Icon } from '@/components/ui/Icon';
import {
  usePreferences,
  type Direction,
  type Accent,
  type Density,
  type Theme,
} from '@/components/providers/PreferencesProvider';

type GroupKey = 'direction' | 'accent' | 'density' | 'theme';

interface Group {
  key: GroupKey;
  label: string;
  options: [string, string][];
}

const GROUPS: Group[] = [
  {
    key: 'direction',
    label: 'Aesthetic',
    options: [
      ['linear', 'Linear'],
      ['things', 'Things'],
      ['current', 'Current'],
    ],
  },
  {
    key: 'accent',
    label: 'Accent',
    options: [
      ['indigo', 'Indigo'],
      ['rust', 'Rust'],
      ['forest', 'Forest'],
      ['graphite', 'Graphite'],
    ],
  },
  {
    key: 'density',
    label: 'Density',
    options: [
      ['default', 'Default'],
      ['comfortable', 'Comfortable'],
      ['compact', 'Compact'],
    ],
  },
  {
    key: 'theme',
    label: 'Theme',
    options: [
      ['light', 'Light'],
      ['dark', 'Dark'],
    ],
  },
];

export function TweaksPanel({ onClose }: { onClose: () => void }) {
  const prefs = usePreferences();

  const current: Record<GroupKey, string> = {
    direction: prefs.direction,
    accent: prefs.accent,
    density: prefs.density,
    theme: prefs.theme,
  };

  const set = (k: GroupKey, v: string) => {
    if (k === 'direction') prefs.setDirection(v as Direction);
    else if (k === 'accent') prefs.setAccent(v as Accent);
    else if (k === 'density') prefs.setDensity(v as Density);
    else if (k === 'theme') prefs.setTheme(v as Theme);
  };

  return (
    <div className="tp-tweaks" role="dialog" aria-label="Preferences">
      <div className="tp-tweaks-head">
        <h4>Tweaks</h4>
        <button
          type="button"
          className="tp-icon-btn"
          style={{ marginLeft: 'auto', width: 22, height: 22 }}
          onClick={onClose}
          aria-label="Close"
        >
          <Icon name="x" size={13} />
        </button>
      </div>
      <div className="tp-tweaks-body">
        {GROUPS.map((g) => (
          <div key={g.key} className="tp-tweak-group">
            <label>{g.label}</label>
            <div className="tp-tweak-opts">
              {g.options.map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  className={`tp-tweak-opt ${current[g.key] === v ? 'active' : ''}`}
                  onClick={() => set(g.key, v)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
