import type { CSSProperties } from 'react';
import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';
import { SIDEBAR_SPLIT_COLORS, pickReadableText, type ColorScheme } from '@/components/invoices/colors';

/** Template 4 — The Sidebar Split: forest-green sidebar, functional main area. */
export function SidebarSplitTemplate({
  data,
  colors = SIDEBAR_SPLIT_COLORS,
}: {
  data: InvoiceData;
  colors?: ColorScheme;
}) {
  const c = { ...SIDEBAR_SPLIT_COLORS, ...colors } as typeof SIDEBAR_SPLIT_COLORS;
  const style = {
    '--c-sidebar': c.sidebar,
    '--c-sidebarText': c.sidebarText,
    '--c-canvas': c.canvas,
    '--c-accent': c.accent,
    '--c-onSidebar': pickReadableText(c.sidebar),
  } as CSSProperties;

  return (
    <div
      style={style}
      className="grid min-h-[1056px] grid-cols-12 bg-[var(--c-canvas)] font-sans text-[#0f172a]"
    >
      <div className="col-span-4 flex flex-col justify-between bg-[var(--c-sidebar)] p-8 text-[var(--c-sidebarText)]">
        <div>
          <p className="text-lg font-semibold">{data.sender.name}</p>
          {data.sender.addressLines.map((line) => (
            <p key={line} className="mt-1 text-xs opacity-70">
              {line}
            </p>
          ))}
          {data.sender.email ? <p className="mt-2 text-xs opacity-70">{data.sender.email}</p> : null}
        </div>

        <div>
          <p className="text-xs font-bold tracking-wider uppercase">Billed to</p>
          <p className="mt-2 font-medium">{data.client.name}</p>
          {data.client.addressLines.map((line) => (
            <p key={line} className="text-xs opacity-70">
              {line}
            </p>
          ))}
          <div className="mt-6 space-y-1">
            <p className="text-xs opacity-70">
              Invoice date <span className="opacity-100">{formatInvoiceDate(data.issueDate)}</span>
            </p>
            <p className="text-xs opacity-70">
              Due date <span className="opacity-100">{formatInvoiceDate(data.dueDate)}</span>
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--c-accent)] pt-4">
          <p className="text-xs font-bold tracking-wider uppercase">Payment</p>
          <p className="mt-2 text-xs opacity-70">{data.paymentInstructions ?? '—'}</p>
          {data.paymentTerms ? <p className="mt-2 text-xs opacity-70">{data.paymentTerms}</p> : null}
        </div>
      </div>

      <div className="col-span-8 flex flex-col justify-between bg-[var(--c-canvas)] p-10">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-semibold text-[var(--c-sidebar)]">Invoice #{data.invoiceNumber}</p>
            <span
              className="rounded-full px-3 py-1 text-xs font-bold"
              style={{ backgroundColor: c.sidebarText, color: c.sidebar }}
            >
              {data.status.toUpperCase()}
            </span>
          </div>

          <table className="mt-8 w-full overflow-hidden rounded-t-lg text-sm">
            <thead>
              <tr
                className="rounded-t-lg"
                style={{ backgroundColor: c.sidebarText, color: c.sidebar }}
              >
                <th className="px-3 py-3 text-left font-semibold">Description</th>
                <th className="px-3 py-3 text-right font-semibold">Qty</th>
                <th className="px-3 py-3 text-right font-semibold">Rate</th>
                <th className="px-3 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-[#f1f5f9]">
                  <td className="px-3 py-3">{item.description}</td>
                  <td className="px-3 py-3 text-right text-[#64748b]">{item.quantity}</td>
                  <td className="px-3 py-3 text-right text-[#64748b]">
                    {formatMoney(item.unitPrice, data.currency)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium">{formatMoney(item.total, data.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto w-1/2 space-y-2">
          <div className="flex justify-between text-sm text-[#64748b]">
            <span>Subtotal</span>
            <span>{formatMoney(data.subtotal, data.currency)}</span>
          </div>
          <div className="flex justify-between text-sm text-[#64748b]">
            <span>Tax ({data.taxRate}%)</span>
            <span>{formatMoney(data.taxAmount, data.currency)}</span>
          </div>
          {data.discount ? (
            <div className="flex justify-between text-sm text-[#64748b]">
              <span>Discount</span>
              <span>-{formatMoney(data.discount, data.currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between rounded-lg bg-[var(--c-sidebar)] p-4 text-lg font-bold text-[var(--c-onSidebar)]">
            <span>Total due</span>
            <span>{formatMoney(data.total, data.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
