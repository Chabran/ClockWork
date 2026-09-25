'use client';

import { useState } from 'react';
import Link from 'next/link';
import { InvoiceRenderer } from '@/components/invoices/InvoiceRenderer';
import { TEMPLATE_LIST } from '@/components/invoices/templates';
import { DEFAULT_TEMPLATE_COLORS, TEMPLATE_COLOR_FIELDS, type ColorScheme } from '@/components/invoices/colors';
import { cn } from '@/components/ui/primitives';
import type { InvoiceData, TemplateId } from '@/types/invoice';

/**
 * Toggles between every template, lets each one's colors be repainted live,
 * and exports the active one to PDF via the browser's native print dialog
 * ("Save as PDF") — no extra PDF library needed for a full-fidelity, styled
 * export; jsPDF (used elsewhere in the app) draws its own primitives and
 * can't reproduce arbitrary CSS like this gallery uses.
 */
export function TemplateSwitcher({ data }: { data: InvoiceData }) {
  const [templateId, setTemplateId] = useState<TemplateId>('executive');

  // Each template keeps its own palette, independent of the others — picking
  // a wild purple for Neo-Brutalist doesn't touch Minimalist's colors, and
  // switching templates and back never loses what you set.
  const [colorsByTemplate, setColorsByTemplate] = useState<Record<TemplateId, ColorScheme>>(() =>
    Object.fromEntries(
      Object.entries(DEFAULT_TEMPLATE_COLORS).map(([id, scheme]) => [id, { ...scheme }]),
    ) as Record<TemplateId, ColorScheme>,
  );

  const activeColors = colorsByTemplate[templateId];
  const colorFields = TEMPLATE_COLOR_FIELDS[templateId];

  const setColor = (key: string, value: string) => {
    setColorsByTemplate((current) => ({
      ...current,
      [templateId]: { ...current[templateId], [key]: value },
    }));
  };

  const resetColors = () => {
    setColorsByTemplate((current) => ({
      ...current,
      [templateId]: { ...DEFAULT_TEMPLATE_COLORS[templateId] },
    }));
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* @page rules can't be expressed as Tailwind utilities — this is the one
          bit of plain CSS the print export needs, scoped to this page only. */}
      <style>{`@media print { @page { margin: 12mm; } html, body { background: #fff; } }`}</style>

      <div className="sticky top-0 z-10 border-b border-line bg-surface/95 p-4 backdrop-blur print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/timesheet" className="mr-2 text-sm font-medium text-accent hover:underline">
            ← Back to timesheet
          </Link>
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
          <button
            type="button"
            onClick={() => window.print()}
            className="ml-auto rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
          >
            Print / Export PDF
          </button>
        </div>

        {/* Colors for whichever template is active — a native color input per
            role, so every hex in that template's spec can be repainted. */}
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <span className="text-xs font-medium text-ink-muted">Colors</span>
          {colorFields.map((field) => (
            <label key={field.key} className="flex items-center gap-1.5 text-xs text-ink-muted">
              <input
                type="color"
                value={activeColors[field.key] ?? '#000000'}
                onChange={(event) => setColor(field.key, event.target.value)}
                aria-label={field.label}
                className="size-6 cursor-pointer rounded border border-line p-0"
              />
              {field.label}
            </label>
          ))}
          <button type="button" onClick={resetColors} className="text-xs font-medium text-accent hover:underline">
            Reset colors
          </button>
        </div>
      </div>

      <div className="overflow-x-auto p-6 print:p-0">
        <InvoiceRenderer templateId={templateId} data={data} colors={activeColors} />
      </div>
    </div>
  );
}
