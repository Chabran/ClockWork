import type { CSSProperties } from 'react';
import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';
import { VIBRANT_POP_COLORS, pickReadableText, type ColorScheme } from '@/components/invoices/colors';

/** Template 8 — The Vibrant Pop: playful, coral & yellow, rounded everything. */
export function VibrantPopTemplate({
  data,
  colors = VIBRANT_POP_COLORS,
}: {
  data: InvoiceData;
  colors?: ColorScheme;
}) {
  const c = { ...VIBRANT_POP_COLORS, ...colors } as typeof VIBRANT_POP_COLORS;
  const style = {
    '--c-primary': c.primary,
    '--c-secondary': c.secondary,
    '--c-ink': c.ink,
    '--c-surface': c.surface,
    '--c-onPrimary': pickReadableText(c.primary),
    '--c-onSecondary': pickReadableText(c.secondary),
  } as CSSProperties;

  return (
    <div style={style} className="relative overflow-hidden bg-[var(--c-surface)] p-10 text-[var(--c-ink)]">
      <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-[var(--c-secondary)]" />

      <div className="relative">
        <span className="inline-block rounded-2xl bg-[var(--c-primary)] px-6 py-3 text-2xl font-extrabold tracking-tight text-[var(--c-onPrimary)]">
          Invoice
        </span>
        <p className="mt-3 text-sm font-bold opacity-60">
          #{data.invoiceNumber} · Issued {formatInvoiceDate(data.issueDate)} · Due {formatInvoiceDate(data.dueDate)}
        </p>
      </div>

      <div className="relative z-10 mt-8 grid grid-cols-2 gap-6">
        <div className="rounded-2xl border-l-4 border-[var(--c-primary)] bg-slate-50 p-5">
          <p className="text-xs font-extrabold text-[var(--c-primary)] uppercase">From</p>
          <p className="mt-1 font-bold">{data.sender.name}</p>
          {data.sender.addressLines.map((line) => (
            <p key={line} className="text-sm opacity-60">
              {line}
            </p>
          ))}
        </div>
        <div className="rounded-2xl border-l-4 border-[var(--c-primary)] bg-slate-50 p-5">
          <p className="text-xs font-extrabold text-[var(--c-primary)] uppercase">Billed to</p>
          <p className="mt-1 font-bold">{data.client.name}</p>
          {data.client.addressLines.map((line) => (
            <p key={line} className="text-sm opacity-60">
              {line}
            </p>
          ))}
        </div>
      </div>

      <table className="mt-8 w-full overflow-hidden text-sm">
        <thead>
          <tr className="rounded-xl bg-[var(--c-secondary)] font-bold text-[var(--c-onSecondary)]">
            <th className="px-4 py-3 text-left">Description</th>
            <th className="px-4 py-3 text-right">Qty</th>
            <th className="px-4 py-3 text-right">Rate</th>
            <th className="px-4 py-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.lineItems.map((item) => (
            <tr key={item.id} className="border-b border-slate-100">
              <td className="px-4 py-4 font-medium">{item.description}</td>
              <td className="px-4 py-4 text-right opacity-60">{item.quantity}</td>
              <td className="px-4 py-4 text-right opacity-60">{formatMoney(item.unitPrice, data.currency)}</td>
              <td className="px-4 py-4 text-right font-bold">{formatMoney(item.total, data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 ml-auto w-72 space-y-1">
        <div className="flex justify-between text-sm opacity-60">
          <span>Subtotal</span>
          <span>{formatMoney(data.subtotal, data.currency)}</span>
        </div>
        <div className="flex justify-between text-sm opacity-60">
          <span>Tax ({data.taxRate}%)</span>
          <span>{formatMoney(data.taxAmount, data.currency)}</span>
        </div>
        {data.discount ? (
          <div className="flex justify-between text-sm opacity-60">
            <span>Discount</span>
            <span>-{formatMoney(data.discount, data.currency)}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-[var(--c-primary)] p-6 text-2xl font-black text-[var(--c-onPrimary)]">
        <span>Total</span>
        <span>{formatMoney(data.total, data.currency)}</span>
      </div>
    </div>
  );
}
