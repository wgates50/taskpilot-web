'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

export function TopBar({
  title,
  meta,
  right,
  onOpenCommandPalette,
}: {
  title: string;
  meta?: ReactNode;
  right?: ReactNode;
  onOpenCommandPalette: () => void;
}) {
  return (
    <header className="tp-topbar">
      <div className="tp-topbar-mobile-brand">
        <div className="tp-brand-mark" style={{ width: 22, height: 22, fontSize: 11, borderRadius: 6 }}>
          TP
        </div>
      </div>
      <h1 className="tp-topbar-title">{title}</h1>
      {meta && <div className="tp-topbar-meta">{meta}</div>}
      <button
        type="button"
        className="tp-icon-btn"
        style={{ marginLeft: meta ? 12 : 'auto' }}
        onClick={onOpenCommandPalette}
        aria-label="Open command palette (⌘K)"
        title="Command palette (⌘K)"
      >
        <Icon name="search" size={16} />
      </button>
      {right}
    </header>
  );
}
