// Tiny button wrapper around .tp-btn classes.
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'default' | 'primary' | 'accent' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  children: ReactNode;
}

export function Button({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...rest
}: Props) {
  const cls = [
    'tp-btn',
    variant !== 'default' ? variant : '',
    size === 'sm' ? 'sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
