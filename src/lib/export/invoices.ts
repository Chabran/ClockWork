import type { CurrencyCode, EnrichedEntry } from '@/lib/types';

export interface InvoiceDraft {
  /** clientId + projectId + currency, so one invoice never sums two currencies. */
  key: string;
  clientName: string;
  projectName: string | null;
  currency: CurrencyCode;
  entries: EnrichedEntry[];
}

/**
 * Splits entries into one draft invoice per client, project and currency.
 *
 * Map keeps keys in insertion order, so drafts appear in the order their first
 * entry does, and each draft's entries keep the order they arrived in.
 */
export function groupIntoInvoices(entries: EnrichedEntry[]): InvoiceDraft[] {
  const drafts = new Map<string, InvoiceDraft>();

  for (const entry of entries) {
    const key = `${entry.clientId}:${entry.projectId ?? 'none'}:${entry.currency}`;

    let draft = drafts.get(key);
    if (!draft) {
      draft = {
        key,
        clientName: entry.clientName,
        projectName: entry.projectName,
        currency: entry.currency,
        entries: [],
      };
      drafts.set(key, draft);
    }

    draft.entries.push(entry);
  }

  return [...drafts.values()];
}

/** How a draft is named on screen and on the PDF, e.g. "Acme · Website". */
export function invoiceLabel(draft: InvoiceDraft): string {
  return draft.projectName ? `${draft.clientName} · ${draft.projectName}` : draft.clientName;
}

/**
 * A download name safe on every OS: "Acme · Website" → "invoice-acme-website-2026-09-25.pdf".
 * Accents are folded to plain letters and anything else becomes a hyphen.
 */
export function invoiceFileName(label: string | null, date: string): string {
  const slug = (label ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `invoice-${slug}-${date}.pdf` : `invoice-${date}.pdf`;
}
