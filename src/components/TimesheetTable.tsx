'use client';

import { useState } from 'react';
import { useTracker } from '@/state/TrackerProvider';
import { EntryEditorDialog } from '@/components/EntryEditorDialog';
import { FiltersBar } from '@/components/FiltersBar';
import { Badge, Button, Card, EmptyState } from '@/components/ui/primitives';
import { formatDay, formatDuration, formatMoney, formatTimeOfDay } from '@/lib/time/format';
import { toDecimalHours } from '@/lib/time/rounding';
import type { EnrichedEntry } from '@/lib/types';

/**
 * The log. Table on desktop, stacked cards on mobile.
 *
 * Rather than a scrolling table with a horizontal bar on phones, the same data
 * is rendered in two layouts and toggled with `hidden`/`md:block`. A timesheet
 * you cannot read on a phone is a timesheet that does not get corrected.
 */
export function TimesheetTable() {
  const { filteredEntries, filteredTotals, deleteEntry, updateEntry, clients, settings } =
    useTracker();
  const [editing, setEditing] = useState<EnrichedEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const currency = clients[0]?.currency ?? settings.defaultCurrency;

  return (
    <Card className="p-0">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
        <div>
          <h2 className="text-sm font-semibold text-ink">Timesheet</h2>
          <p className="tabular text-sm text-ink-muted">
            {filteredTotals.entryCount} entries · {formatDuration(filteredTotals.seconds)} tracked ·{' '}
            {toDecimalHours(filteredTotals.billedSeconds).toFixed(2)} h billed{' '}
            {filteredTotals.overtimeSeconds > 0
              ? `(incl. ${toDecimalHours(filteredTotals.overtimeSeconds).toFixed(2)} h OT) `
              : ''}
            ·{' '}
            <span className="font-medium text-positive">
              {formatMoney(filteredTotals.earnings, currency)}
            </span>
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreating(true)}>
          + Add time
        </Button>
      </header>

      {/* One slim toolbar instead of a wall of controls: the panel opens over the
          table rather than pushing it down the page. */}
      <div className="border-b border-line px-5 py-3">
        <FiltersBar />
      </div>

      {filteredEntries.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title="No entries match these filters"
            body="Clock in above, or add a past shift manually — nothing is lost if you forgot to start the timer."
          />
        </div>
      ) : (
        <>
          {/* Desktop */}
          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="text-left text-xs tracking-wide text-ink-muted uppercase">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Client / Project</th>
                <th className="px-5 py-3 font-medium">Job title</th>
                <th className="px-5 py-3 text-right font-medium">Tracked</th>
                <th className="px-5 py-3 text-right font-medium">Billed</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-t border-line align-top hover:bg-surface-muted/60">
                  <td className="px-5 py-3 whitespace-nowrap text-ink-muted">
                    <div className="text-ink">{formatDay(entry.startTime)}</div>
                    <div className="tabular text-xs">
                      {formatTimeOfDay(entry.startTime)} – {formatTimeOfDay(entry.endTime)}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge color={clients.find((c) => c.id === entry.clientId)?.color}>
                      {entry.clientName}
                    </Badge>
                    {entry.projectName ? (
                      <div className="mt-1 text-xs text-ink-muted">{entry.projectName}</div>
                    ) : null}
                  </td>
                  <td className="max-w-xs px-5 py-3 text-ink">
                    {entry.description || <span className="text-ink-muted">—</span>}
                    {entry.isActive ? (
                      <span className="ml-2 text-xs font-medium text-positive">● running</span>
                    ) : null}
                  </td>
                  <td className="tabular px-5 py-3 text-right text-ink-muted">
                    {formatDuration(entry.liveSeconds)}
                  </td>
                  <td className="tabular px-5 py-3 text-right text-ink">
                    {toDecimalHours(entry.billedSeconds).toFixed(2)} h
                    {entry.overtimeApplied ? (
                      <div className="text-xs font-medium text-accent">
                        incl. {entry.overtimeApplied.hours} h OT ×
                        {entry.overtimeApplied.multiplier}
                      </div>
                    ) : null}
                  </td>
                  <td className="tabular px-5 py-3 text-right font-medium text-ink">
                    {entry.isBillable ? (
                      formatMoney(entry.earnings, entry.currency)
                    ) : (
                      <span className="text-xs font-normal text-ink-muted">non-billable</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <RowActions
                      entry={entry}
                      onEdit={() => setEditing(entry)}
                      onToggleBillable={() =>
                        updateEntry(entry.id, { isBillable: !entry.isBillable })
                      }
                      onDelete={() => deleteEntry(entry.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile */}
          <ul className="divide-y divide-line md:hidden">
            {filteredEntries.map((entry) => (
              <li key={entry.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge color={clients.find((c) => c.id === entry.clientId)?.color}>
                      {entry.clientName}
                    </Badge>
                    <p className="mt-1.5 text-sm text-ink">{entry.description || '—'}</p>
                    <p className="tabular text-xs text-ink-muted">
                      {formatDay(entry.startTime)} · {formatTimeOfDay(entry.startTime)} –{' '}
                      {formatTimeOfDay(entry.endTime)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-sm font-semibold text-ink">
                      {formatDuration(entry.liveSeconds)}
                    </p>
                    <p className="tabular text-xs text-positive">
                      {entry.isBillable ? formatMoney(entry.earnings, entry.currency) : '—'}
                    </p>
                    {entry.overtimeApplied ? (
                      <p className="text-xs font-medium text-accent">
                        {entry.overtimeApplied.hours} h OT ×{entry.overtimeApplied.multiplier}
                      </p>
                    ) : null}
                  </div>
                </div>
                <RowActions
                  entry={entry}
                  onEdit={() => setEditing(entry)}
                  onToggleBillable={() => updateEntry(entry.id, { isBillable: !entry.isBillable })}
                  onDelete={() => deleteEntry(entry.id)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <EntryEditorDialog
        open={isCreating || editing !== null}
        entry={editing}
        onClose={() => {
          setIsCreating(false);
          setEditing(null);
        }}
      />
    </Card>
  );
}

function RowActions({
  entry,
  onEdit,
  onToggleBillable,
  onDelete,
}: {
  entry: EnrichedEntry;
  onEdit: () => void;
  onToggleBillable: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={onToggleBillable}>
        {entry.isBillable ? 'Mark non-billable' : 'Mark billable'}
      </Button>
      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={onEdit}>
        Edit
      </Button>
      {confirming ? (
        <>
          <Button
            variant="danger"
            className="px-2 py-1 text-xs"
            onClick={() => {
              onDelete();
              setConfirming(false);
            }}
          >
            Confirm
          </Button>
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setConfirming(false)}>
            No
          </Button>
        </>
      ) : (
        <Button
          variant="danger"
          className="px-2 py-1 text-xs"
          onClick={() => setConfirming(true)}
          aria-label={`Delete entry from ${formatDay(entry.startTime)}`}
        >
          Delete
        </Button>
      )}
    </div>
  );
}
