'use client';

import { useEffect, useMemo, useState } from 'react';
import { ScaledInvoicePreview } from '@/components/invoices/ScaledInvoicePreview';
import { TEMPLATE_LIST } from '@/components/invoices/templates';
import { DEFAULT_TEMPLATE_COLORS, TEMPLATE_COLOR_FIELDS, type ColorScheme } from '@/components/invoices/colors';
import { loadColorPreset, loadLastTemplate, saveColorPreset, saveLastTemplate } from '@/components/invoices/templatePrefs';
import { Button, cn } from '@/components/ui/primitives';
import { sumEntries } from '@/lib/selectors';
import { formatMoney } from '@/lib/time/format';
import type { ExportMode } from '@/lib/export/pdf';
import { invoiceLabel, type InvoiceDraft } from '@/lib/export/invoices';
import { buildInvoiceDataList } from '@/lib/export/invoice-adapter';
import type { Settings } from '@/lib/types';
import type { InvoiceData, TemplateId } from '@/types/invoice';

/**
 * Everything an export needs to settle in one place: which invoices, how
 * they're bundled, and which template design (with its colors) renders
 * them — with a live preview of the real data, so nothing about the
 * download is a surprise.
 *
 * Every draft starts selected — exporting everything you were already
 * looking at is the common case, so the dialog opens ready to go rather
 * than empty. The template defaults to whatever was used last time, and its
 * colors to whatever was saved for it (or the template's own defaults if
 * nothing was ever saved) — this dialog is now the one and only stop before
 * a PDF downloads, so whatever is set here is exactly what exports.
 */
export function InvoiceExportDialog({
  open,
  onClose,
  drafts,
  settings,
  periodLabel,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  drafts: InvoiceDraft[];
  settings: Settings;
  periodLabel: string;
  onExport: (items: InvoiceData[], templateId: TemplateId, colors: ColorScheme) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(drafts.map((d) => d.key)));
  const [mode, setMode] = useState<ExportMode>('combined');
  const [templateId, setTemplateId] = useState<TemplateId>('executive');
  const [colors, setColors] = useState<ColorScheme>(() => ({ ...DEFAULT_TEMPLATE_COLORS.executive }));
  const [isExporting, setIsExporting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Re-select everything on each open: the underlying entries can have
  // changed (a filter, an edit) since the dialog last closed, and a stale
  // selection would silently drop drafts the user never chose to exclude.
  // The template picks up wherever it was left last time.
  useEffect(() => {
    if (!open) return;
    setSelected(new Set(drafts.map((d) => d.key)));
    setTemplateId(loadLastTemplate() ?? 'executive');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Whenever the active template changes (including on open), load its
  // saved color preset — falling back to the template's own defaults if the
  // user never saved one for it.
  useEffect(() => {
    if (!open) return;
    setColors(loadColorPreset(templateId) ?? { ...DEFAULT_TEMPLATE_COLORS[templateId] });
    setJustSaved(false);
  }, [open, templateId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

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
  const colorFields = TEMPLATE_COLOR_FIELDS[templateId];

  // The exact items that will export — the preview is never a stand-in, it's
  // the real data rendered in the real template.
  const previewItems = useMemo(
    () => buildInvoiceDataList(chosen, mode, { settings, rule: settings.roundingRule, periodLabel }),
    [chosen, mode, settings, periodLabel],
  );
  const previewData = previewItems[0];

  const setColor = (key: string, value: string) => {
    setColors((current) => ({ ...current, [key]: value }));
    setJustSaved(false);
  };

  const handleSaveColors = () => {
    saveColorPreset(templateId, colors);
    setJustSaved(true);
  };

  const handleResetColors = () => {
    setColors({ ...DEFAULT_TEMPLATE_COLORS[templateId] });
    setJustSaved(false);
  };

  const handleExport = async () => {
    if (previewItems.length === 0) return;
    setIsExporting(true);
    try {
      await onExport(previewItems, templateId, colors);
      saveLastTemplate(templateId);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export invoices"
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-t-2xl border border-line bg-surface p-5 shadow-xl sm:rounded-2xl"
      >
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Export invoices</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            Esc
          </button>
        </header>

        {/* One shared scroll on mobile (everything stacks, nothing gets a
            second nested scrollbar) — two independently-scrolling panes
            side by side from `lg` up, so a long invoice list doesn't push
            the preview out of view on a wide screen. */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
          <div className="space-y-4 lg:overflow-y-auto lg:pr-1">
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

              <ul className="max-h-48 space-y-1.5 overflow-y-auto">
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

            {/* Which design renders the export, and that design's colors —
                whatever is set here is exactly what downloads. */}
            <div className="space-y-2 border-t border-line pt-4">
              <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                Template
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_LIST.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setTemplateId(template.id)}
                    aria-pressed={templateId === template.id}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                      templateId === template.id
                        ? 'border-accent bg-accent text-white'
                        : 'border-line text-ink-muted hover:bg-surface-muted',
                    )}
                  >
                    {template.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface-muted p-3">
                {colorFields.map((field) => (
                  <label key={field.key} className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <input
                      type="color"
                      value={colors[field.key] ?? '#000000'}
                      onChange={(event) => setColor(field.key, event.target.value)}
                      aria-label={field.label}
                      className="size-6 cursor-pointer rounded border border-line p-0"
                    />
                    {field.label}
                  </label>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  {justSaved ? <span className="text-xs text-accent">Saved</span> : null}
                  <button
                    type="button"
                    onClick={handleResetColors}
                    className="text-xs font-medium text-ink-muted hover:underline"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveColors}
                    className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-surface-muted"
                  >
                    Save colors
                  </button>
                </div>
              </div>
              <p className="text-xs text-ink-muted">
                Saved colors become this template&apos;s new default — reused every time you pick
                it, until you save over them again.
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-col lg:overflow-hidden">
            <span className="mb-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
              Preview
            </span>
            <div className="rounded-xl border border-line bg-surface-muted p-3 lg:flex-1 lg:overflow-auto lg:p-4">
              {previewData ? (
                <ScaledInvoicePreview templateId={templateId} data={previewData} colors={colors} />
              ) : (
                <p className="p-6 text-center text-sm text-ink-muted">Nothing to preview.</p>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-4 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="w-full sm:w-auto"
            variant="primary"
            onClick={handleExport}
            disabled={chosen.length === 0 || isExporting}
          >
            {isExporting
              ? 'Building…'
              : `Export ${chosen.length > 1 && mode === 'separate' ? `${chosen.length} invoices` : 'PDF'}`}
          </Button>
        </footer>
      </div>
    </div>
  );
}
