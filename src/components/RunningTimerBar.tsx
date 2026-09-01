'use client';

import Link from 'next/link';
import { useTracker } from '@/state/TrackerProvider';
import { Button } from '@/components/ui/primitives';
import { formatHMS, formatMoney } from '@/lib/time/format';

/**
 * Sticky status bar for the secondary screen.
 *
 * Splitting the app into two screens creates one risk: forgetting the clock is
 * running while you are three filters deep in the timesheet. This bar removes
 * it — the live time is always in view, and Pause / Clock out are reachable
 * without navigating back.
 */
export function RunningTimerBar() {
  const { activeEntry, isRunning, elapsedSeconds, accruedEarnings, pauseTimer, resumeTimer, stopTimer } =
    useTracker();

  return (
    <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-line bg-canvas/85 px-4 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3">
        {/* Deliberately a button, not a text link: returning to the clock is the
            most common action on this screen and should look pressable. */}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-2 text-sm font-semibold text-accent transition hover:border-accent/60"
        >
          <span aria-hidden>←</span> Back to clock
        </Link>

        {activeEntry ? (
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-xs text-ink-muted">
                {activeEntry.clientName}
                {activeEntry.projectName ? ` · ${activeEntry.projectName}` : ''}
              </p>
              <p className="tabular text-xs text-positive">
                {activeEntry.isBillable
                  ? formatMoney(accruedEarnings, activeEntry.currency)
                  : 'Non-billable'}
              </p>
            </div>
            <span className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${isRunning ? 'animate-pulse bg-positive' : 'bg-ink-muted/40'}`}
                aria-hidden
              />
              <span className="tabular text-base font-semibold text-ink">
                {formatHMS(elapsedSeconds)}
              </span>
            </span>
            {isRunning ? (
              <Button onClick={pauseTimer} className="px-3 py-1.5 text-xs">
                Pause
              </Button>
            ) : (
              <Button variant="primary" onClick={resumeTimer} className="px-3 py-1.5 text-xs">
                Resume
              </Button>
            )}
            <Button variant="primary" onClick={stopTimer} className="px-3 py-1.5 text-xs">
              Clock out
            </Button>
          </div>
        ) : (
          <Link href="/">
            <span className="inline-flex items-center rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90">
              Clock in
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
