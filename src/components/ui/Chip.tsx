// Small pill: label + optional variant.
import type { ReactNode } from 'react';

export type ChipVariant = 'default' | 'accent' | 'urgent';

export function Chip({
  children,
  variant = 'default',
  className = '',
  onClick,
  title,
}: {
  children: ReactNode;
  variant?: ChipVariant;
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      className={`tp-chip ${variant !== 'default' ? variant : ''} ${className}`}
      onClick={onClick}
      title={title}
      type={onClick ? 'button' : undefined}
    >
      {children}
    </Tag>
  );
}
