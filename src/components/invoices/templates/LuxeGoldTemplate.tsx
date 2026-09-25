import type { CSSProperties } from 'react';
import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';
import { LUXE_GOLD_COLORS, pickReadableText, type ColorScheme } from '@/components/invoices/colors';

/** Template 10 — The Luxe Gold: high-end, espresso & gold, double-frame border. */
export function LuxeGoldTemplate({
  data,
  colors = LUXE_GOLD_COLORS,
}: {
  data: InvoiceData;
  colors?: ColorScheme;
}) {
  const c = { ...LUXE_GOLD_COLORS, ...colors } as typeof LUXE_GOLD_COLORS;
  const style = {
    '--c-accent': c.accent,
    '--c-ink': c.ink,
    '--c-canvas': c.canvas,
    '--c-border': c.border,
    '--c-onInk': pickReadableText(c.ink),
  } as CSSProperties;

  return (
    <div style={style} className="border-[12px] border-[var(--c-ink)] bg-[var(--c-canvas)] p-12 text-[var(--c-ink)]">
      <div className="h-full border border-[var(--c-accent)] p-8">
        <div className="text-center">
          <p className="font-serif text-2xl tracking-[0.3em] text-[var(--c-ink)] uppercase">{data.sender.name}</p>
          <div className="my-4 border-y border-[var(--c-accent)] py-2 text-center text-xs tracking-[0.2em] text-[var(--c-accent)]">
            Invoice #{data.invoiceNumber}
          </div>
        </div>

        <div className="my-8 grid grid-cols-2 gap-8">
          <div>
            <p className="text-[10px] tracking-widest text-[var(--c-accent)] uppercase">Billed to</p>
            <p className="mt-2 font-medium">{data.client.name}</p>
            {data.client.addressLines.map((line) => (
              <p key={line} className="text-sm opacity-70">
                {line}
              </p>
            ))}
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-widest text-[var(--c-accent)] uppercase">Issue date</p>
            <p className="text-sm">{formatInvoiceDate(data.issueDate)}</p>
            <p className="mt-2 text-[10px] tracking-widest text-[var(--c-accent)] uppercase">Due date</p>
            <p className="text-sm">{formatInvoiceDate(data.dueDate)}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--c-accent)] text-[10px] tracking-widest text-[var(--c-accent)] uppercase">
              <th className="pb-2 text-left font-normal">Description</th>
              <th className="pb-2 text-right font-normal">Qty</th>
              <th className="pb-2 text-right font-normal">Rate</th>
              <th className="pb-2 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item) => (
              <tr key={item.id} className="border-b border-[var(--c-border)]">
                <td className="py-3">{item.description}</td>
                <td className="py-3 text-right opacity-70">{item.quantity}</td>
                <td className="py-3 text-right opacity-70">{formatMoney(item.unitPrice, data.currency)}</td>
                <td className="py-3 text-right font-medium">{formatMoney(item.total, data.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 ml-auto w-72 border border-[var(--c-accent)] bg-[var(--c-ink)] p-6 text-[var(--c-onInk)]">
          <div className="flex justify-between text-xs opacity-70">
            <span>Subtotal</span>
            <span>{formatMoney(data.subtotal, data.currency)}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs opacity-70">
            <span>Tax ({data.taxRate}%)</span>
            <span>{formatMoney(data.taxAmount, data.currency)}</span>
          </div>
          {data.discount ? (
            <div className="mt-1 flex justify-between text-xs opacity-70">
              <span>Discount</span>
              <span>-{formatMoney(data.discount, data.currency)}</span>
            </div>
          ) : null}
          <div className="mt-3 flex items-baseline justify-between border-t border-[var(--c-accent)]/40 pt-3">
            <span className="text-xs tracking-widest uppercase">Total due</span>
            <span className="font-serif text-2xl text-[var(--c-accent)]">{formatMoney(data.total, data.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
