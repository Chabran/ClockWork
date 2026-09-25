'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, cn } from '@/components/ui/primitives';
import { sumEntries } from '@/lib/selectors';
import { formatMoney } from '@/lib/time/format';
import type { ExportMode } from '@/lib/export/pdf';
import { invoiceLabel, type InvoiceDraft } from '@/lib/export/invoices';

/**
 * Lets the user choose which draft invoices to export, and whether they land
 * as one combined PDF or one PDF per draft.
 *
 * Every draft starts selected — exporting everything you were already looking
 * at is the common case, so the dialog opens ready to go rather than empty.
 *
 * This dialog only decides WHICH invoices and WHICH mode — it hands that off
 * to `onContinue` rather than building a PDF itself, so the template picker
 * (which design to render them in) always comes next, never bypassed.
 */
export function InvoiceExportDialog({
  open,
  onClose,
  drafts,
  onContinue,
}: {
  open: boolean;
  onClose: () => void;
  drafts: InvoiceDraft[];
  onContinue: (chosen: InvoiceDraft[], mode: ExportMode) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(drafts.map((d) => d.key)));
  const [mode, setMode] = useState<ExportMode>('combined');

  // Re-select everything on each open: the underlying entries can have
  // changed (a filter, an edit) since the dialog last closed, and a stale
  // selection would silently drop drafts the user never chose to exclude.
  useEffect(() => {
    if (open) setSelected(new Set(drafts.map((d) => d.key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (key: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const chosen = drafts.filter((draft) => selected.has(draft.key));
  const allSelected = chosen.length === drafts.length && drafts.length > 0;

  const handleContinue = () => {
    if (chosen.length === 0) return;
    onContinue(chosen, mode);
  };

  return (
    <Modal
      open={open}
      title="Export invoices"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleContinue} disabled={chosen.length === 0}>
            {`Continue with ${chosen.length} ${chosen.length === 1 ? 'invoice' : 'invoices'}`}
          </Button>
        </>
      }
    >
      {/* One PDF per client/project/currency combination, so the user picks
          exactly what goes out rather than always shipping everything. */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Invoices in this period
          </span>
          <button
            type="button"
            onClick={() =>
              setSelected(allSelected ? new Set() : new Set(drafts.map((d) => d.key)))
            }
            className="text-xs font-medium text-accent hover:underline"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        <ul className="max-h-64 space-y-1.5 overflow-y-auto">
          {drafts.map((draft) => {
            const totals = sumEntries(draft.entries);
            const checked = selected.has(draft.key);
            return (
              <li key={draft.key}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition',
                    checked ? 'border-accent/40 bg-accent-soft' : 'border-line hover:bg-surface-muted',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(draft.key)}
                      className="size-4 accent-accent"
                    />
                    <span>
                      <span className="font-medium text-ink">{invoiceLabel(draft)}</span>
                      <span className="ml-1.5 text-xs text-ink-muted">
                        {draft.entries.length} {draft.entries.length === 1 ? 'entry' : 'entries'}
                      </span>
                    </span>
                  </span>
                  <span className="tabular text-sm font-medium text-ink">
                    {formatMoney(totals.earnings, draft.currency)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {/* How the selected drafts land on disk — one file, or one each. */}
      <div className="space-y-1.5 border-t border-line pt-4">
        <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
          Download as
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={mode === 'combined'}
            onClick={() => setMode('combined')}
            className={cn(
              'rounded-lg border px-3 py-2 text-left text-sm transition',
              mode === 'combined'
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-line text-ink hover:bg-surface-muted',
            )}
          >
            <span className="block font-medium">One combined PDF</span>
            <span className="block text-xs text-ink-muted">
              Every selected invoice in one file
            </span>
          </button>
          <button
            type="button"
            aria-pressed={mode === 'separate'}
            onClick={() => setMode('separate')}
            className={cn(
              'rounded-lg border px-3 py-2 text-left text-sm transition',
              mode === 'separate'
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-line text-ink hover:bg-surface-muted',
            )}
          >
            <span className="block font-medium">Separate PDFs</span>
            <span className="block text-xs text-ink-muted">One file per invoice, zipped</span>
          </button>
        </div>
        {mode === 'separate' && chosen.length > 1 ? (
          <p className="text-xs text-ink-muted">
            Downloads as one .zip containing a PDF per invoice — browsers block several files
            downloading at once, so this always arrives in one piece.
          </p>
        ) : null}
      </div>

      <p className="border-t border-line pt-3 text-xs text-ink-muted">
        Next: pick which template these invoices export in, with a live preview.
      </p>
    </Modal>
  );
}
