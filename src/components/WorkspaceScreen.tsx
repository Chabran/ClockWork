'use client';

import { useTracker } from '@/state/TrackerProvider';
import { RunningTimerBar } from '@/components/RunningTimerBar';
import { SummaryMetrics } from '@/components/SummaryMetrics';
import { TimesheetTable } from '@/components/TimesheetTable';
import { ThemeToggle } from '@/components/ThemeToggle';

/** The secondary screen: totals, filters, the log, and exports. */
export function WorkspaceScreen() {
  const { isHydrated } = useTracker();

  return (
    <div className="px-4 pb-10 sm:px-6">
      <RunningTimerBar />

      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink">Timesheet</h1>
            <p className="text-sm text-ink-muted">Totals, history, and invoice exports</p>
          </div>
          <ThemeToggle />
        </header>

        {!isHydrated ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading your timesheet">
            <div className="h-28 animate-pulse rounded-2xl bg-surface-muted" />
            <div className="h-40 animate-pulse rounded-2xl bg-surface-muted" />
            <div className="h-96 animate-pulse rounded-2xl bg-surface-muted" />
          </div>
        ) : (
          <main className="space-y-6">
            <SummaryMetrics />
            <TimesheetTable />
          </main>
        )}

        <footer className="mt-10 text-center text-xs text-ink-muted">
          Data is stored locally in this browser. Swap the storage adapter to sync it anywhere.
        </footer>
      </div>
    </div>
  );
}
