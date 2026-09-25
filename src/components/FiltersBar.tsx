'use client';

import { useEffect, useRef, useState } from 'react';
import { endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns';
import { useTracker } from '@/state/TrackerProvider';
import { Button, Field, Input, Select, cn } from '@/components/ui/primitives';
import { SORT_LABELS } from '@/lib/selectors';
import { ROUNDING_LABELS } from '@/lib/time/rounding';
import { ROUNDING_RULES, SORT_ORDERS, type RoundingRule, type SortOrder } from '@/lib/types';
import { exportCsv } from '@/lib/export/csv';
import { groupIntoInvoices } from '@/lib/export/invoices';
import { exportInvoices } from '@/lib/export/pdf';
import { InvoiceExportDialog } from '@/components/InvoiceExportDialog';
import type { EnrichedEntry } from '@/lib/types';

/**
 * Filter, sort and export — collapsed into one button.
 *
 * Eight controls sitting permanently above the table pushed the data down the
 * page and read as clutter, because on most visits none of them are in use.
 * They now live behind a "Filter & sort" button, with two rules that keep a
 * hidden panel from hiding *state*:
 *
 *  1. the button carries a count of the filters currently applied, and
 *  2. each active filter shows as a chip in the bar, dismissable in one click.
 *
 * You can always see WHAT is filtering the table; you only open the panel to
 * change it.
 *
 * `exportEntries` defaults to every filtered row, but the table above can
 * narrow it to a hand-picked selection — the export buttons never need to
 * know which case they're in, they just export whatever they're handed.
 */
export function FiltersBar({
  exportEntries,
  selectionActive,
  selectedCount,
  onToggleSelection,
}: {
  exportEntries: EnrichedEntry[];
  selectionActive: boolean;
  selectedCount: number;
  onToggleSelection: () => void;
}) {
  const {
    filters,
    setFilters,
    resetFilters,
    settings,
    updateSettings,
    clients,
    projectsForClient,
  } = useTracker();
  const [isOpen, setIsOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click and on Escape — the two things every popover owes
  // the user. `pointerdown` beats `click` so the panel closes before a stray
  // control underneath can receive the press.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const clientName = (id: string) => clients.find((client) => client.id === id)?.name ?? 'Client';
  const projectName = (id: string) =>
    filters.clientId !== 'all'
      ? (projectsForClient(filters.clientId).find((project) => project.id === id)?.name ?? 'Project')
      : 'Project';

  // Every active filter, described once, then rendered as both a count and chips.
  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.clientId !== 'all')
    activeChips.push({
      key: 'client',
      label: clientName(filters.clientId),
      clear: () => setFilters({ clientId: 'all', projectId: 'all' }),
    });
  if (filters.projectId !== 'all')
    activeChips.push({
      key: 'project',
      label: projectName(filters.projectId),
      clear: () => setFilters({ projectId: 'all' }),
    });
  if (filters.billable !== 'all')
    activeChips.push({
      key: 'billable',
      label: filters.billable === 'billable' ? 'Billable only' : 'Non-billable only',
      clear: () => setFilters({ billable: 'all' }),
    });
  if (filters.from || filters.to)
    activeChips.push({
      key: 'dates',
      label: `${filters.from ? format(new Date(filters.from), 'd MMM') : 'Start'} – ${
        filters.to ? format(new Date(filters.to), 'd MMM') : 'Now'
      }`,
      clear: () => setFilters({ from: null, to: null }),
    });
  if (filters.search.trim())
    activeChips.push({
      key: 'search',
      label: `“${filters.search.trim()}”`,
      clear: () => setFilters({ search: '' }),
    });

  const quickRange = (from: Date, to: Date) =>
    setFilters({ from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') });

  const periodLabel =
    filters.from && filters.to
      ? `${format(new Date(filters.from), 'd MMM')} – ${format(new Date(filters.to), 'd MMM yyyy')}`
      : 'All time';

  const drafts = groupIntoInvoices(exportEntries);

  /**
   * The dialog exists for two different reasons, and either one is enough to
   * show it:
   *  - there's more than one invoice draft, so "combined vs. separate" and
   *    "which ones" are real questions with more than one answer, or
   *  - the user hand-picked more than one row, so exporting is a deliberate
   *    enough act that it deserves a look before it downloads, even if those
   *    rows happen to collapse into a single draft (same client, same project).
   * Neither is true — no selection, and the filtered view is already just one
   * invoice — there's nothing to choose, so it downloads immediately.
   */
  const hasMultiRowSelection = selectionActive && selectedCount > 1;
  const shouldConfirmExport = drafts.length > 1 || hasMultiRowSelection;

  const handleExportPdf = async () => {
    if (shouldConfirmExport) {
      setIsExportDialogOpen(true);
      return;
    }
    setIsExporting(true);
    try {
      await exportInvoices(drafts, { settings, rule: settings.roundingRule, periodLabel }, 'combined');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative" ref={panelRef}>
        <Button
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={cn(isOpen && 'border-accent text-accent')}
        >
          Filter &amp; sort
          {activeChips.length > 0 ? (
            <span className="tabular ml-0.5 rounded-full bg-accent px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white">
              {activeChips.length}
            </span>
          ) : null}
          <span aria-hidden className={cn('text-ink-muted transition', isOpen && 'rotate-180')}>
            ▾
          </span>
        </Button>

        {isOpen ? (
          <div
            role="dialog"
            aria-label="Filter and sort the timesheet"
            className="absolute top-full left-0 z-40 mt-2 w-[min(92vw,44rem)] rounded-2xl border border-line bg-surface p-4 shadow-xl"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Sort by">
                <Select
                  value={filters.sort}
                  onChange={(event) => setFilters({ sort: event.target.value as SortOrder })}
                >
                  {SORT_ORDERS.map((order) => (
                    <option key={order} value={order}>
                      {SORT_LABELS[order]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Client">
                <Select
                  value={filters.clientId}
                  onChange={(event) =>
                    setFilters({ clientId: event.target.value, projectId: 'all' })
                  }
                >
                  <option value="all">All clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Project">
                <Select
                  value={filters.projectId}
                  disabled={filters.clientId === 'all'}
                  onChange={(event) => setFilters({ projectId: event.target.value })}
                >
                  <option value="all">All projects</option>
                  {filters.clientId !== 'all' &&
                    projectsForClient(filters.clientId).map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                </Select>
              </Field>

              <Field label="Billable">
                <Select
                  value={filters.billable}
                  onChange={(event) =>
                    setFilters({ billable: event.target.value as typeof filters.billable })
                  }
                >
                  <option value="all">All time</option>
                  <option value="billable">Billable only</option>
                  <option value="non-billable">Non-billable only</option>
                </Select>
              </Field>

              <Field label="From">
                <Input
                  type="date"
                  value={filters.from ?? ''}
                  onChange={(event) => setFilters({ from: event.target.value || null })}
                />
              </Field>

              <Field label="To">
                <Input
                  type="date"
                  value={filters.to ?? ''}
                  onChange={(event) => setFilters({ to: event.target.value || null })}
                />
              </Field>

              <Field label="Search" className="sm:col-span-2 lg:col-span-3">
                <Input
                  value={filters.search}
                  placeholder="Description, client…"
                  onChange={(event) => setFilters({ search: event.target.value })}
                />
              </Field>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
              <Button
                className="px-2.5 py-1 text-xs"
                onClick={() => quickRange(startOfWeek(new Date(), { weekStartsOn: 1 }), new Date())}
              >
                This week
              </Button>
              <Button
                className="px-2.5 py-1 text-xs"
                onClick={() => quickRange(startOfMonth(new Date()), endOfMonth(new Date()))}
              >
                This month
              </Button>
              <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={resetFilters}>
                Clear all
              </Button>
            </div>

            {/* Export settings, not filters — they shape the invoice, not the view,
                so they are separated rather than mixed in above. */}
            <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
              <Field
                label="Billing rounding"
                hint="Applied at export — tracked time is never altered."
              >
                <Select
                  value={settings.roundingRule}
                  onChange={(event) =>
                    updateSettings({ roundingRule: event.target.value as RoundingRule })
                  }
                >
                  {ROUNDING_RULES.map((rule) => (
                    <option key={rule} value={rule}>
                      {ROUNDING_LABELS[rule]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Invoice from">
                <Input
                  value={settings.invoiceFromName}
                  onChange={(event) => updateSettings({ invoiceFromName: event.target.value })}
                />
              </Field>
            </div>
          </div>
        ) : null}
      </div>

      {/* Active filters stay visible even with the panel shut. */}
      {activeChips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.clear}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent transition hover:border-accent/60"
          aria-label={`Remove filter: ${chip.label}`}
        >
          {chip.label}
          <span aria-hidden className="opacity-60">
            ✕
          </span>
        </button>
      ))}

      {filters.sort !== 'newest' ? (
        <span className="rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs text-ink-muted">
          {SORT_LABELS[filters.sort]}
        </span>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <Button
          onClick={onToggleSelection}
          className={cn('px-3 py-1.5 text-xs', selectionActive && 'border-accent text-accent')}
        >
          {selectionActive ? `${selectedCount} selected · Done` : 'Select'}
        </Button>
        <Button
          onClick={() => exportCsv(exportEntries, settings.roundingRule)}
          disabled={exportEntries.length === 0}
          className="px-3 py-1.5 text-xs"
        >
          Export CSV
        </Button>
        <Button
          variant="primary"
          onClick={handleExportPdf}
          disabled={exportEntries.length === 0 || isExporting}
          className="px-3 py-1.5 text-xs"
        >
          {isExporting ? 'Building…' : shouldConfirmExport ? 'Export PDF…' : 'Export PDF'}
        </Button>
      </div>

      <InvoiceExportDialog
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        drafts={drafts}
        settings={settings}
        rule={settings.roundingRule}
        periodLabel={periodLabel}
      />
    </div>
  );
}
