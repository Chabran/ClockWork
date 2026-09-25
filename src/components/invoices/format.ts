import { format, parseISO } from 'date-fns';

/** Shared by every template so a given amount prints identically everywhere
 *  ($1,234.50, not $1234.5 in one template and $1,234.5 in another). */
export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
  }).format(amount);
}

export function formatInvoiceDate(iso: string): string {
  return format(parseISO(iso), 'MMM d, yyyy');
}
