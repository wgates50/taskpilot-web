import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Fraunces } from 'next/font/google';
import { PreferencesProvider } from '@/components/providers/PreferencesProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--tp-font-sans',
  display: 'swap',
});
const jbmono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--tp-font-mono',
  display: 'swap',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--tp-font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TaskPilot',
  description: 'Your AI task automation hub',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TaskPilot',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbfc' },
    { media: '(prefers-color-scheme: dark)',  color: '#0b0c10' },
  ],
};

// Pre-hydration attribute application — avoids FOUC on first paint.
const PREHYDRATE_SCRIPT = `
(function(){try{
  var raw = localStorage.getItem('tp-prefs');
  var p = raw ? JSON.parse(raw) : {};
  var el = document.documentElement;
  el.dataset.direction = p.direction || 'linear';
  el.dataset.accent    = p.accent    || 'indigo';
  el.dataset.density   = p.density   || 'default';
  el.dataset.theme     = p.theme     || 'light';
  el.style.colorScheme = el.dataset.theme;
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jbmono.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREHYDRATE_SCRIPT }} />
      </head>
      <body className="h-full" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
