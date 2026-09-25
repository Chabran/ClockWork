import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';

/** Template 4 — The Sidebar Split: forest-green sidebar, functional main area. */
export function SidebarSplitTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="grid min-h-[1056px] grid-cols-12 bg-white font-sans text-slate-900">
      <div className="col-span-4 flex flex-col justify-between bg-[#1E3F20] p-8 text-[#E8F5E9]">
        <div>
          <p className="text-lg font-semibold">{data.sender.name}</p>
          {data.sender.addressLines.map((line) => (
            <p key={line} className="mt-1 text-xs text-[#E8F5E9]/70">
              {line}
            </p>
          ))}
          {data.sender.email ? <p className="mt-2 text-xs text-[#E8F5E9]/70">{data.sender.email}</p> : null}
        </div>

        <div>
          <p className="text-xs font-bold tracking-wider uppercase">Billed to</p>
          <p className="mt-2 font-medium">{data.client.name}</p>
          {data.client.addressLines.map((line) => (
            <p key={line} className="text-xs text-[#E8F5E9]/70">
              {line}
            </p>
          ))}
          <div className="mt-6 space-y-1">
            <p className="text-xs text-[#E8F5E9]/70">
              Invoice date <span className="text-[#E8F5E9]">{formatInvoiceDate(data.issueDate)}</span>
            </p>
            <p className="text-xs text-[#E8F5E9]/70">
              Due date <span className="text-[#E8F5E9]">{formatInvoiceDate(data.dueDate)}</span>
            </p>
          </div>
        </div>

        <div className="border-t border-[#2E5A31] pt-4">
          <p className="text-xs font-bold tracking-wider uppercase">Payment</p>
          <p className="mt-2 text-xs text-[#E8F5E9]/70">{data.paymentInstructions ?? '—'}</p>
          {data.paymentTerms ? <p className="mt-2 text-xs text-[#E8F5E9]/70">{data.paymentTerms}</p> : null}
        </div>
      </div>

      <div className="col-span-8 flex flex-col justify-between bg-white p-10">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-semibold text-[#1E3F20]">Invoice #{data.invoiceNumber}</p>
            <span className="rounded-full bg-[#E8F5E9] px-3 py-1 text-xs font-bold text-[#1E3F20]">
              {data.status.toUpperCase()}
            </span>
          </div>

          <table className="mt-8 w-full overflow-hidden rounded-t-lg text-sm">
            <thead>
              <tr className="rounded-t-lg bg-[#E8F5E9] text-[#1E3F20]">
                <th className="px-3 py-3 text-left font-semibold">Description</th>
                <th className="px-3 py-3 text-right font-semibold">Qty</th>
                <th className="px-3 py-3 text-right font-semibold">Rate</th>
                <th className="px-3 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-3 py-3">{item.description}</td>
                  <td className="px-3 py-3 text-right text-slate-500">{item.quantity}</td>
                  <td className="px-3 py-3 text-right text-slate-500">
                    {formatMoney(item.unitPrice, data.currency)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium">{formatMoney(item.total, data.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto w-1/2 space-y-2">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span>{formatMoney(data.subtotal, data.currency)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500">
            <span>Tax ({data.taxRate}%)</span>
            <span>{formatMoney(data.taxAmount, data.currency)}</span>
          </div>
          {data.discount ? (
            <div className="flex justify-between text-sm text-slate-500">
              <span>Discount</span>
              <span>-{formatMoney(data.discount, data.currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between rounded-lg bg-[#1E3F20] p-4 text-lg font-bold text-white">
            <span>Total due</span>
            <span>{formatMoney(data.total, data.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
