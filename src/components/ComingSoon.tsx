import { Icon, type IconName } from '@/components/ui/Icon';

export function ComingSoon({
  title,
  blurb,
  icon,
}: {
  title: string;
  blurb: string;
  icon: IconName;
}) {
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '60vh',
        padding: 24,
      }}
    >
      <div
        className="tp-card"
        style={{
          maxWidth: 420,
          textAlign: 'center',
          padding: '28px 26px',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--r-3)',
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 14px',
          }}
        >
          <Icon name={icon} size={22} />
        </div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            marginBottom: 6,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 13.5,
            color: 'var(--text-2)',
            lineHeight: 1.55,
            marginBottom: 12,
          }}
        >
          {blurb}
        </p>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            color: 'var(--text-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Coming soon
        </div>
      </div>
    </div>
  );
}
