'use client';

import { useEffect, useState } from 'react';
import { InvoiceRenderer } from '@/components/invoices/InvoiceRenderer';
import { TEMPLATE_LIST } from '@/components/invoices/templates';
import { Button, cn } from '@/components/ui/primitives';
import type { InvoiceData, TemplateId } from '@/types/invoice';

const LAST_TEMPLATE_KEY = 'clockwork:last-invoice-template';

function isTemplateId(value: string | null): value is TemplateId {
  return value !== null && TEMPLATE_LIST.some((template) => template.id === value);
}

/**
 * The last stop before a PDF downloads: pick a design, see it rendered
 * against the REAL invoice(s) about to export, then export in that design.
 *
 * Colors aren't editable here — that lives in the full template gallery at
 * /invoices/preview. This dialog is scoped to the one decision that has to
 * happen on every export: which design.
 */
export function TemplatePickerDialog({
  open,
  onClose,
  items,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  /** The exact InvoiceData objects that will become PDF pages/files — the
   *  preview renders the first one; every item exports in the chosen design. */
  items: InvoiceData[];
  onExport: (templateId: TemplateId) => Promise<void>;
}) {
  const [templateId, setTemplateId] = useState<TemplateId>('executive');
  const [isExporting, setIsExporting] = useState(false);

  // Remember the last design picked, across sessions — most people settle on
  // one invoice look and reuse it every time.
  useEffect(() => {
    if (!open) return;
    try {
      const stored = window.localStorage.getItem(LAST_TEMPLATE_KEY);
      if (isTemplateId(stored)) setTemplateId(stored);
    } catch {
      // localStorage can throw (private browsing, disabled storage) — the
      // picker just falls back to its default, nothing to recover.
    }
  }, [open]);

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

  if (!open) return null;

  const previewData = items[0];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(templateId);
      try {
        window.localStorage.setItem(LAST_TEMPLATE_KEY, templateId);
      } catch {
        // Same as above — remembering the choice is a nicety, not a
        // requirement, so a storage failure here doesn't block the export.
      }
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

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
        aria-label="Choose an invoice template"
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-t-2xl border border-line bg-surface p-5 shadow-xl sm:rounded-2xl"
      >
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Choose a template</h2>
            <p className="text-xs text-ink-muted">
              {items.length > 1
                ? `Previewing 1 of ${items.length} — each invoice exports separately in this design.`
                : 'This design is used for the exported PDF.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            Esc
          </button>
        </header>

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

        <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border border-line bg-surface-muted p-4">
          {previewData ? (
            <InvoiceRenderer templateId={templateId} data={previewData} />
          ) : (
            <p className="p-6 text-center text-sm text-ink-muted">Nothing to preview.</p>
          )}
        </div>

        <footer className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleExport} disabled={!previewData || isExporting}>
            {isExporting ? 'Building…' : `Export ${items.length > 1 ? `${items.length} invoices` : 'PDF'}`}
          </Button>
        </footer>
      </div>
    </div>
  );
}
