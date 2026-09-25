import type { CSSProperties } from 'react';
import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';
import { EXECUTIVE_COLORS, pickReadableText, type ColorScheme } from '@/components/invoices/colors';

/** Template 1 — The Executive: classic, navy, boardroom-safe. */
export function ExecutiveTemplate({
  data,
  colors = EXECUTIVE_COLORS,
}: {
  data: InvoiceData;
  colors?: ColorScheme;
}) {
  // Cast to the known literal keys, not a generic string index: the object
  // always has every role EXECUTIVE_COLORS defines, but a plain
  // Record<string, string> would make every c.x lookup "string | undefined"
  // under noUncheckedIndexedAccess.
  const c = { ...EXECUTIVE_COLORS, ...colors } as typeof EXECUTIVE_COLORS;
  const onPrimary = pickReadableText(c.primary);
  const style = {
    '--c-primary': c.primary,
    '--c-secondary': c.secondary,
    '--c-surface': c.surface,
    '--c-tableHeader': c.tableHeader,
    '--c-onPrimary': onPrimary,
  } as CSSProperties;

  return (
    <div style={style} className="bg-[var(--c-surface)] font-sans text-[var(--c-primary)]">
      <div className="flex items-center justify-between bg-[var(--c-primary)] p-10 text-[var(--c-onPrimary)]">
        <div>
          <p className="text-lg font-semibold">{data.sender.name}</p>
          <p className="mt-1 text-xs opacity-70">{data.sender.addressLines.join(' · ')}</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-light tracking-widest">INVOICE</p>
          <p className="mt-1 text-sm opacity-80">#{data.invoiceNumber}</p>
        </div>
      </div>

      <div className="p-10">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-bold tracking-wider text-[var(--c-secondary)] uppercase">Bill to</p>
            <p className="mt-2 font-semibold text-[var(--c-primary)]">{data.client.name}</p>
            {data.client.addressLines.map((line) => (
              <p key={line} className="text-sm text-[var(--c-secondary)]">
                {line}
              </p>
            ))}
            {data.client.email ? (
              <p className="mt-1 text-sm text-[var(--c-secondary)]">{data.client.email}</p>
            ) : null}
          </div>
          <table className="ml-auto text-sm">
            <tbody>
              <tr>
                <td className="py-1 pr-6 text-right text-xs font-bold tracking-wider text-[var(--c-secondary)] uppercase">
                  Issue date
                </td>
                <td className="py-1 text-right font-medium">{formatInvoiceDate(data.issueDate)}</td>
              </tr>
              <tr>
                <td className="py-1 pr-6 text-right text-xs font-bold tracking-wider text-[var(--c-secondary)] uppercase">
                  Due date
                </td>
                <td className="py-1 text-right font-medium">{formatInvoiceDate(data.dueDate)}</td>
              </tr>
              {data.poNumber ? (
                <tr>
                  <td className="py-1 pr-6 text-right text-xs font-bold tracking-wider text-[var(--c-secondary)] uppercase">
                    PO number
                  </td>
                  <td className="py-1 text-right font-medium">{data.poNumber}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <table className="mt-10 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-[var(--c-primary)] bg-[var(--c-tableHeader)] text-xs font-bold tracking-wider text-[var(--c-primary)] uppercase">
              <th className="px-3 py-3 text-left">Description</th>
              <th className="px-3 py-3 text-right">Qty</th>
              <th className="px-3 py-3 text-right">Rate</th>
              <th className="px-3 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item) => (
              <tr key={item.id} className="border-b border-slate-200">
                <td className="px-3 py-3 text-[var(--c-primary)]">{item.description}</td>
                <td className="px-3 py-3 text-right text-[var(--c-secondary)]">{item.quantity}</td>
                <td className="px-3 py-3 text-right text-[var(--c-secondary)]">
                  {formatMoney(item.unitPrice, data.currency)}
                </td>
                <td className="px-3 py-3 text-right font-medium text-[var(--c-primary)]">
                  {formatMoney(item.total, data.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-6 w-1/3 space-y-2 text-sm">
          <div className="flex justify-between text-[var(--c-secondary)]">
            <span>Subtotal</span>
            <span>{formatMoney(data.subtotal, data.currency)}</span>
          </div>
          <div className="flex justify-between text-[var(--c-secondary)]">
            <span>Tax ({data.taxRate}%)</span>
            <span>{formatMoney(data.taxAmount, data.currency)}</span>
          </div>
          {data.discount ? (
            <div className="flex justify-between text-[var(--c-secondary)]">
              <span>Discount</span>
              <span>-{formatMoney(data.discount, data.currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between bg-[var(--c-primary)] p-3 font-bold text-[var(--c-onPrimary)]">
            <span>Grand total</span>
            <span>{formatMoney(data.total, data.currency)}</span>
          </div>
        </div>

        {data.paymentTerms ? (
          <p className="mt-10 border-t border-slate-200 pt-4 text-xs text-[var(--c-secondary)]">
            {data.paymentTerms}
          </p>
        ) : null}
      </div>
    </div>
  );
}
