// Monogram glyph. Replaces emoji. Tone variants a..f.
import type { ReactNode } from 'react';

export type GlyphTone = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
export type GlyphSize = 'sm' | 'md' | 'lg';

const SIZE: Record<GlyphSize, { w: number; font: number; r: string }> = {
  sm: { w: 20, font: 9.5, r: '4px' },
  md: { w: 26, font: 11,  r: 'var(--r-2)' },
  lg: { w: 36, font: 13,  r: 'var(--r-3)' },
};

export function Glyph({
  mono,
  tone = 'f',
  size = 'md',
  className = '',
}: {
  mono: ReactNode;
  tone?: GlyphTone;
  size?: GlyphSize;
  className?: string;
}) {
  const s = SIZE[size];
  return (
    <div
      data-tone={tone}
      className={`tp-glyph ${className}`}
      style={{
        width: s.w,
        height: s.w,
        fontFamily: 'var(--font-mono)',
        fontSize: s.font,
        fontWeight: 600,
        letterSpacing: '-0.02em',
        borderRadius: s.r,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        background: 'var(--surface-2)',
        color: 'var(--text-2)',
        border: '1px solid var(--line)',
      }}
    >
      {mono}
    </div>
  );
}
