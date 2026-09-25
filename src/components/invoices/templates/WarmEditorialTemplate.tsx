import type { CSSProperties } from 'react';
import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';
import { WARM_EDITORIAL_COLORS, type ColorScheme } from '@/components/invoices/colors';

/** Template 5 — The Warm Editorial: terracotta, cream, serif headings, pill rows. */
export function WarmEditorialTemplate({
  data,
  colors = WARM_EDITORIAL_COLORS,
}: {
  data: InvoiceData;
  colors?: ColorScheme;
}) {
  const c = { ...WARM_EDITORIAL_COLORS, ...colors } as typeof WARM_EDITORIAL_COLORS;
  const style = {
    '--c-primary': c.primary,
    '--c-canvas': c.canvas,
    '--c-ink': c.ink,
    '--c-cardSurface': c.cardSurface,
  } as CSSProperties;

  return (
    <div style={style} className="bg-[var(--c-canvas)] p-12 text-[var(--c-ink)]">
      <div className="text-center">
        <p className="font-serif text-3xl tracking-wide text-[var(--c-primary)] italic">{data.sender.name}</p>
        <div className="mx-auto my-4 h-px w-24 bg-[var(--c-primary)]" />
        <p className="text-xs tracking-[0.2em] opacity-70 uppercase">
          Invoice #{data.invoiceNumber} · Issued {formatInvoiceDate(data.issueDate)} · Due{' '}
          {formatInvoiceDate(data.dueDate)}
        </p>
      </div>

      <div className="my-8 grid grid-cols-2 gap-8 rounded-2xl bg-[var(--c-cardSurface)] p-6">
        <div>
          <p className="font-serif text-sm text-[var(--c-primary)] italic">From</p>
          <p className="mt-2 font-medium">{data.sender.name}</p>
          {data.sender.addressLines.map((line) => (
            <p key={line} className="text-sm opacity-70">
              {line}
            </p>
          ))}
        </div>
        <div>
          <p className="font-serif text-sm text-[var(--c-primary)] italic">Billed to</p>
          <p className="mt-2 font-medium">{data.client.name}</p>
          {data.client.addressLines.map((line) => (
            <p key={line} className="text-sm opacity-70">
              {line}
            </p>
          ))}
        </div>
      </div>

      <div>
        {data.lineItems.map((item) => (
          <div
            key={item.id}
            className="mb-2 flex items-center justify-between rounded-xl bg-[var(--c-cardSurface)]/60 p-4"
          >
            <div>
              <p className="font-medium">{item.description}</p>
              <p className="text-xs opacity-60">
                {item.quantity} × {formatMoney(item.unitPrice, data.currency)}
              </p>
            </div>
            <p className="font-medium text-[var(--c-primary)]">{formatMoney(item.total, data.currency)}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 ml-auto w-64 space-y-1 text-right">
        <div className="flex justify-between text-sm opacity-70">
          <span>Subtotal</span>
          <span>{formatMoney(data.subtotal, data.currency)}</span>
        </div>
        <div className="flex justify-between text-sm opacity-70">
          <span>Tax ({data.taxRate}%)</span>
          <span>{formatMoney(data.taxAmount, data.currency)}</span>
        </div>
        {data.discount ? (
          <div className="flex justify-between text-sm opacity-70">
            <span>Discount</span>
            <span>-{formatMoney(data.discount, data.currency)}</span>
          </div>
        ) : null}
        <p className="pt-3 font-serif text-sm text-[var(--c-primary)] italic">Total due</p>
        <p className="text-2xl font-bold text-[var(--c-primary)]">{formatMoney(data.total, data.currency)}</p>
      </div>
    </div>
  );
}
