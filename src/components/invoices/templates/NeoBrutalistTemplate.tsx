import type { CSSProperties } from 'react';
import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';
import { NEO_BRUTALIST_COLORS, pickReadableText, type ColorScheme } from '@/components/invoices/colors';

/** Template 3 — The Neo-Brutalist: hard shadows, pure black borders, loud. */
export function NeoBrutalistTemplate({
  data,
  colors = NEO_BRUTALIST_COLORS,
}: {
  data: InvoiceData;
  colors?: ColorScheme;
}) {
  const c = { ...NEO_BRUTALIST_COLORS, ...colors } as typeof NEO_BRUTALIST_COLORS;
  const style = {
    '--c-accent1': c.accent1,
    '--c-accent2': c.accent2,
    '--c-ink': c.ink,
    '--c-surface': c.surface,
    '--c-onAccent1': pickReadableText(c.accent1),
    '--c-onAccent2': pickReadableText(c.accent2),
  } as CSSProperties;

  return (
    <div
      style={style}
      className="border-4 border-[var(--c-ink)] bg-[var(--c-surface)] p-8 font-sans text-[var(--c-ink)]"
    >
      <div className="flex justify-between border-2 border-[var(--c-ink)] bg-[var(--c-accent1)] p-6 text-[var(--c-onAccent1)] shadow-[6px_6px_0px_0px_var(--c-ink)]">
        <div>
          <p className="text-2xl font-bold uppercase">{data.sender.name}</p>
          <p className="mt-1 font-mono text-xs">{data.sender.email}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold uppercase">Invoice</p>
          <p className="font-mono text-sm">#{data.invoiceNumber}</p>
        </div>
      </div>

      <div className="my-6 grid grid-cols-2 gap-6">
        <div className="border-2 border-[var(--c-ink)] bg-[var(--c-surface)] p-4 shadow-[4px_4px_0px_0px_var(--c-ink)]">
          <p className="text-xs font-bold uppercase">Client</p>
          <p className="mt-2 font-bold">{data.client.name}</p>
          {data.client.addressLines.map((line) => (
            <p key={line} className="font-mono text-xs">
              {line}
            </p>
          ))}
        </div>
        <div className="border-2 border-[var(--c-ink)] bg-[var(--c-accent2)] p-4 text-[var(--c-onAccent2)] shadow-[4px_4px_0px_0px_var(--c-ink)]">
          <p className="text-xs font-bold uppercase">Invoice meta</p>
          <p className="mt-2 font-mono text-xs">Issued {formatInvoiceDate(data.issueDate)}</p>
          <p className="font-mono text-xs">Due {formatInvoiceDate(data.dueDate)}</p>
          {data.poNumber ? <p className="font-mono text-xs">PO {data.poNumber}</p> : null}
        </div>
      </div>

      <table className="w-full border-2 border-[var(--c-ink)] divide-y-2 divide-[var(--c-ink)] text-sm">
        <thead>
          <tr className="bg-[var(--c-ink)] text-[var(--c-surface)] uppercase">
            <th className="px-3 py-3 text-left font-bold">Description</th>
            <th className="px-3 py-3 text-right font-bold">Qty</th>
            <th className="px-3 py-3 text-right font-bold">Rate</th>
            <th className="px-3 py-3 text-right font-bold">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-[var(--c-ink)]">
          {data.lineItems.map((item) => (
            <tr key={item.id}>
              <td className="px-3 py-3 font-bold">{item.description}</td>
              <td className="px-3 py-3 text-right font-mono">{item.quantity}</td>
              <td className="px-3 py-3 text-right font-mono">{formatMoney(item.unitPrice, data.currency)}</td>
              <td className="px-3 py-3 text-right font-mono font-bold">{formatMoney(item.total, data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 ml-auto w-1/2 space-y-1 font-mono text-sm">
        <div className="flex justify-between">
          <span>SUBTOTAL</span>
          <span>{formatMoney(data.subtotal, data.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span>TAX ({data.taxRate}%)</span>
          <span>{formatMoney(data.taxAmount, data.currency)}</span>
        </div>
        {data.discount ? (
          <div className="flex justify-between">
            <span>DISCOUNT</span>
            <span>-{formatMoney(data.discount, data.currency)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-2 border-[var(--c-ink)] bg-[var(--c-accent2)] p-4 text-xl font-bold text-[var(--c-onAccent2)] shadow-[4px_4px_0px_0px_var(--c-ink)]">
          <span>TOTAL</span>
          <span>{formatMoney(data.total, data.currency)}</span>
        </div>
      </div>
    </div>
  );
}
