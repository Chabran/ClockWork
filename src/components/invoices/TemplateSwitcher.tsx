'use client';

import { useState } from 'react';
import Link from 'next/link';
import { InvoiceRenderer } from '@/components/invoices/InvoiceRenderer';
import { TEMPLATE_LIST } from '@/components/invoices/templates';
import { cn } from '@/components/ui/primitives';
import type { InvoiceData, TemplateId } from '@/types/invoice';

/**
 * Toggles between all 10 templates and exports the active one to PDF via the
 * browser's native print dialog ("Save as PDF") — no extra PDF library needed
 * for a full-fidelity, styled export; jsPDF (used elsewhere in the app) draws
 * its own primitives and can't reproduce arbitrary CSS like this gallery uses.
 */
export function TemplateSwitcher({ data }: { data: InvoiceData }) {
  const [templateId, setTemplateId] = useState<TemplateId>('executive');

  return (
    <div className="min-h-screen bg-canvas">
      {/* @page rules can't be expressed as Tailwind utilities — this is the one
          bit of plain CSS the print export needs, scoped to this page only. */}
      <style>{`@media print { @page { margin: 12mm; } html, body { background: #fff; } }`}</style>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-line bg-surface/95 p-4 backdrop-blur print:hidden">
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

      <div className="overflow-x-auto p-6 print:p-0">
        <InvoiceRenderer templateId={templateId} data={data} />
      </div>
    </div>
  );
}
