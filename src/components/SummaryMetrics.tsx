'use client';

import { useTracker } from '@/state/TrackerProvider';
import { Card } from '@/components/ui/primitives';
import { formatDuration, formatMoney } from '@/lib/time/format';
import type { PeriodTotals } from '@/lib/selectors';

/**
 * Dashboard headline numbers plus a per-client breakdown.
 *
 * Design note: earnings sit next to hours everywhere. Hours are the input a
 * freelancer tracks; money is the reason they track it. Showing one without the
 * other makes the tool feel like a stopwatch rather than a business dashboard.
 */
export function SummaryMetrics() {
  const { totals, breakdown, filteredTotals, settings } = useTracker();
  const currency = settings.defaultCurrency;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-ink">Time invested</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Today" totals={totals.today} currency={currency} />
        <MetricCard label="This week" totals={totals.week} currency={currency} />
        <MetricCard label="This month" totals={totals.month} currency={currency} />
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-ink">
          By client
          <span className="ml-2 font-normal text-ink-muted">current filters</span>
        </h2>
        {breakdown.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">No tracked time yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {breakdown.map((row) => {
              const share =
                filteredTotals.seconds > 0
                  ? Math.min(100, (row.seconds / filteredTotals.seconds) * 100)
                  : 0;
              return (
                <li key={row.clientId}>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: row.color }}
                        aria-hidden
                      />
                      {row.clientName}
                    </span>
                    <span className="tabular text-right">
                      <span className="text-base font-semibold text-positive">
                        {formatMoney(row.earnings, row.currency)}
                      </span>
                      <span className="ml-2 text-xs text-ink-muted">
                        {formatDuration(row.seconds)}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${share}%`, backgroundColor: row.color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  totals,
  currency,
}: {
  label: string;
  totals: PeriodTotals;
  currency: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">{label}</p>
      {/* Money leads. The hours are how you got there; the money is why you
          looked. Reversing the type scale is the whole change — same data, and
          the number people actually want is now the one they see first. */}
      <p className="tabular mt-2 text-3xl leading-none font-semibold text-positive">
        {formatMoney(totals.earnings, currency)}
      </p>
      <p className="tabular mt-1.5 text-sm text-ink-muted">
        <span className="font-medium text-ink">{formatDuration(totals.seconds)}</span>
        {' · '}
        {totals.entryCount} {totals.entryCount === 1 ? 'entry' : 'entries'}
      </p>
    </Card>
  );
}
