import type { Metadata, Viewport } from 'next';
import { TrackerProvider } from '@/state/TrackerProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clockwork — Freelance Time Clock',
  description:
    'Clock in, clock out, and know exactly what you have earned. Client rates, billable hours, and invoice-ready exports.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d12' },
  ],
};

/**
 * The provider lives in the ROOT LAYOUT, not in a page.
 *
 * App Router keeps the layout mounted across client-side navigation, so the
 * timer, its interval and its storage subscription survive moving between
 * /  and /timesheet. Put the provider in a page instead and every navigation
 * would unmount the hook, re-read localStorage and restart the clock.
 *
 * `suppressHydrationWarning` is scoped to <html> only: the inline script below
 * sets the theme class before React hydrates, which React would otherwise flag.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before first paint so dark-mode users never see a white flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('freelance-timeclock:v1')||'{}');var t=(s.settings&&s.settings.theme)||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <TrackerProvider>{children}</TrackerProvider>
      </body>
    </html>
  );
}
