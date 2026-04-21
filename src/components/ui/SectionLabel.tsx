// Sub-section heading: monospaced caps + rule + optional count + slot.
import type { ReactNode } from 'react';

export function SectionLabel({
  children,
  count,
  right,
  className = '',
}: {
  children: ReactNode;
  count?: number;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`tp-section-label ${className}`}>
      <span>{children}</span>
      <span className="rule" />
      {count != null && <span className="count">{String(count).padStart(2, '0')}</span>}
      {right}
    </div>
  );
}
