import type { CSSProperties } from 'react';
import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';
import { MINIMALIST_COLORS, type ColorScheme } from '@/components/invoices/colors';

/** Template 2 — The Minimalist: clean, airy — with one deliberate spot of
 *  color (the accent) instead of staying fully monochrome. */
export function MinimalistTemplate({
  data,
  colors = MINIMALIST_COLORS,
}: {
  data: InvoiceData;
  colors?: ColorScheme;
}) {
  const c = { ...MINIMALIST_COLORS, ...colors } as typeof MINIMALIST_COLORS;
  const style = {
    '--c-ink': c.ink,
    '--c-canvas': c.canvas,
    '--c-muted': c.muted,
    '--c-border': c.border,
    '--c-accent': c.accent,
  } as CSSProperties;

  return (
    <div style={style} className="bg-[var(--c-canvas)] p-14 font-light text-[var(--c-ink)]">
      <div className="flex items-end justify-between">
        <p className="text-lg font-medium">{data.sender.name}</p>
        <p className="text-sm font-medium text-[var(--c-accent)]">#{data.invoiceNumber}</p>
      </div>

      <div className="my-12 grid grid-cols-3 gap-8">
        <div>
          <p className="text-[11px] tracking-[0.2em] text-[var(--c-muted)] uppercase">Billed to</p>
          <p className="mt-2 font-normal">{data.client.name}</p>
          {data.client.addressLines.map((line) => (
            <p key={line} className="text-sm text-[var(--c-muted)]">
              {line}
            </p>
          ))}
        </div>
        <div>
          <p className="text-[11px] tracking-[0.2em] text-[var(--c-muted)] uppercase">Issued / Due</p>
          <p className="mt-2 text-sm">{formatInvoiceDate(data.issueDate)}</p>
          <p className="text-sm text-[var(--c-muted)]">{formatInvoiceDate(data.dueDate)}</p>
        </div>
        <div>
          <p className="text-[11px] tracking-[0.2em] text-[var(--c-muted)] uppercase">Payment terms</p>
          <p className="mt-2 text-sm text-[var(--c-muted)]">{data.paymentTerms ?? '—'}</p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--c-border)] text-[11px] tracking-[0.2em] text-[var(--c-muted)] uppercase">
            <th className="pb-3 text-left font-normal">Description</th>
            <th className="pb-3 text-right font-normal">Qty</th>
            <th className="pb-3 text-right font-normal">Rate</th>
            <th className="pb-3 text-right font-normal">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.lineItems.map((item) => (
            <tr key={item.id} className="border-b border-[var(--c-border)]">
              <td className="py-5 font-normal">{item.description}</td>
              <td className="py-5 text-right text-[var(--c-muted)]">{item.quantity}</td>
              <td className="py-5 text-right text-[var(--c-muted)]">
                {formatMoney(item.unitPrice, data.currency)}
              </td>
              <td className="py-5 text-right font-normal">{formatMoney(item.total, data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto mt-10 w-64 space-y-2 text-right">
        <div className="flex justify-between text-sm text-[var(--c-muted)]">
          <span>Subtotal</span>
          <span>{formatMoney(data.subtotal, data.currency)}</span>
        </div>
        <div className="flex justify-between text-sm text-[var(--c-muted)]">
          <span>Tax ({data.taxRate}%)</span>
          <span>{formatMoney(data.taxAmount, data.currency)}</span>
        </div>
        {data.discount ? (
          <div className="flex justify-between text-sm text-[var(--c-muted)]">
            <span>Discount</span>
            <span>-{formatMoney(data.discount, data.currency)}</span>
          </div>
        ) : null}
        <p className="pt-4 text-[11px] tracking-[0.2em] text-[var(--c-muted)] uppercase">Total due</p>
        <p className="text-3xl font-light text-[var(--c-accent)]">{formatMoney(data.total, data.currency)}</p>
      </div>
    </div>
  );
}
