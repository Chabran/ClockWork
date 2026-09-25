import { addDays, format } from 'date-fns';
import { sumEntries } from '@/lib/selectors';
import { toDecimalHours } from '@/lib/time/rounding';
import { invoiceLabel, type InvoiceDraft } from '@/lib/export/invoices';
import type { RoundingRule, Settings } from '@/lib/types';
import type { InvoiceData, InvoiceLineItem } from '@/types/invoice';

export interface InvoiceAdapterOptions {
  settings: Settings;
  rule: RoundingRule;
  /** Human label for the period, e.g. "1–31 Aug 2026" — carried into the PDF
   *  as the payment-terms line since the templates have no separate slot for
   *  it and it's useful context on the document either way. */
  periodLabel: string;
}

/**
 * Deterministic per-draft, per-day invoice number: stable across re-renders
 * (so the live template preview never "flickers" a new number) and distinct
 * enough that two drafts exported together don't collide.
 */
function draftInvoiceNumber(draft: InvoiceDraft): string {
  let hash = 0;
  for (let i = 0; i < draft.key.length; i += 1) {
    hash = (hash * 31 + draft.key.charCodeAt(i)) >>> 0;
  }
  const suffix = hash.toString(36).toUpperCase().slice(0, 5).padStart(5, '0');
  return `INV-${format(new Date(), 'yyyyMMdd')}-${suffix}`;
}

function draftToLineItems(draft: InvoiceDraft): InvoiceLineItem[] {
  return draft.entries.map((entry) => ({
    id: entry.id,
    description: entry.description || 'Time worked',
    quantity: toDecimalHours(entry.billedSeconds),
    unitPrice: entry.rateApplied,
    total: entry.isBillable ? entry.earnings : 0,
  }));
}

/**
 * Turns one invoice draft into the data shape every template renders.
 *
 * The app has no address book or tax model yet, so `addressLines` comes back
 * empty and tax is always zero — templates all handle a zero tax line and an
 * absent discount fine, they just render "Tax (0%): $0.00" rather than
 * omitting the row, so an invoice done this way still looks complete.
 */
export function draftToInvoiceData(draft: InvoiceDraft, options: InvoiceAdapterOptions): InvoiceData {
  const totals = sumEntries(draft.entries);
  const issueDate = format(new Date(), 'yyyy-MM-dd');

  return {
    invoiceNumber: draftInvoiceNumber(draft),
    status: 'sent',
    issueDate,
    dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    currency: draft.currency,
    sender: { name: options.settings.invoiceFromName, addressLines: [] },
    client: { name: draft.clientName, addressLines: draft.projectName ? [draft.projectName] : [] },
    lineItems: draftToLineItems(draft),
    subtotal: totals.earnings,
    taxRate: 0,
    taxAmount: 0,
    total: totals.earnings,
    paymentTerms: `Period: ${options.periodLabel} · Net 30`,
  };
}

/**
 * Builds exactly the InvoiceData objects that will become PDF pages/files —
 * one merged invoice for "combined" (or when there's only one draft anyway),
 * one per draft for "separate". The template picker previews this same list,
 * so what you see there is what you get in the download.
 */
export function buildInvoiceDataList(
  drafts: InvoiceDraft[],
  mode: 'combined' | 'separate',
  options: InvoiceAdapterOptions,
): InvoiceData[] {
  if (drafts.length === 0) return [];

  if (mode === 'combined' || drafts.length === 1) {
    const merged = drafts.flatMap((draft) => draft.entries);
    const totals = sumEntries(merged);
    const label = drafts.length === 1 ? invoiceLabel(drafts[0]!) : null;
    const clientNames = [...new Set(drafts.map((draft) => draft.clientName))];
    const issueDate = format(new Date(), 'yyyy-MM-dd');

    return [
      {
        invoiceNumber: draftInvoiceNumber(drafts[0]!),
        status: 'sent',
        issueDate,
        dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        currency: drafts[0]!.currency,
        sender: { name: options.settings.invoiceFromName, addressLines: [] },
        client: { name: label ?? clientNames.join(', '), addressLines: [] },
        lineItems: merged.map((entry) => ({
          id: entry.id,
          description: entry.description || 'Time worked',
          quantity: toDecimalHours(entry.billedSeconds),
          unitPrice: entry.rateApplied,
          total: entry.isBillable ? entry.earnings : 0,
        })),
        subtotal: totals.earnings,
        taxRate: 0,
        taxAmount: 0,
        total: totals.earnings,
        paymentTerms: `Period: ${options.periodLabel} · Net 30`,
      },
    ];
  }

  return drafts.map((draft) => draftToInvoiceData(draft, options));
}
