import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';

/** Template 1 — The Executive: classic, navy, boardroom-safe. */
export function ExecutiveTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="bg-white font-sans text-[#1B365D]">
      <div className="flex items-center justify-between bg-[#1B365D] p-10 text-white">
        <div>
          <p className="text-lg font-semibold">{data.sender.name}</p>
          <p className="mt-1 text-xs text-white/70">{data.sender.addressLines.join(' · ')}</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-light tracking-widest">INVOICE</p>
          <p className="mt-1 text-sm text-white/80">#{data.invoiceNumber}</p>
        </div>
      </div>

      <div className="p-10">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-bold tracking-wider text-[#68727D] uppercase">Bill to</p>
            <p className="mt-2 font-semibold text-[#1B365D]">{data.client.name}</p>
            {data.client.addressLines.map((line) => (
              <p key={line} className="text-sm text-[#68727D]">
                {line}
              </p>
            ))}
            {data.client.email ? <p className="mt-1 text-sm text-[#68727D]">{data.client.email}</p> : null}
          </div>
          <table className="ml-auto text-sm">
            <tbody>
              <tr>
                <td className="py-1 pr-6 text-right text-xs font-bold tracking-wider text-[#68727D] uppercase">
                  Issue date
                </td>
                <td className="py-1 text-right font-medium">{formatInvoiceDate(data.issueDate)}</td>
              </tr>
              <tr>
                <td className="py-1 pr-6 text-right text-xs font-bold tracking-wider text-[#68727D] uppercase">
                  Due date
                </td>
                <td className="py-1 text-right font-medium">{formatInvoiceDate(data.dueDate)}</td>
              </tr>
              {data.poNumber ? (
                <tr>
                  <td className="py-1 pr-6 text-right text-xs font-bold tracking-wider text-[#68727D] uppercase">
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
            <tr className="border-b-2 border-[#1B365D] bg-[#F1F5F9] text-xs font-bold tracking-wider text-[#1B365D] uppercase">
              <th className="px-3 py-3 text-left">Description</th>
              <th className="px-3 py-3 text-right">Qty</th>
              <th className="px-3 py-3 text-right">Rate</th>
              <th className="px-3 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item) => (
              <tr key={item.id} className="border-b border-slate-200">
                <td className="px-3 py-3 text-[#1B365D]">{item.description}</td>
                <td className="px-3 py-3 text-right text-[#68727D]">{item.quantity}</td>
                <td className="px-3 py-3 text-right text-[#68727D]">{formatMoney(item.unitPrice, data.currency)}</td>
                <td className="px-3 py-3 text-right font-medium text-[#1B365D]">
                  {formatMoney(item.total, data.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-6 w-1/3 space-y-2 text-sm">
          <div className="flex justify-between text-[#68727D]">
            <span>Subtotal</span>
            <span>{formatMoney(data.subtotal, data.currency)}</span>
          </div>
          <div className="flex justify-between text-[#68727D]">
            <span>Tax ({data.taxRate}%)</span>
            <span>{formatMoney(data.taxAmount, data.currency)}</span>
          </div>
          {data.discount ? (
            <div className="flex justify-between text-[#68727D]">
              <span>Discount</span>
              <span>-{formatMoney(data.discount, data.currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between bg-[#1B365D] p-3 font-bold text-white">
            <span>Grand total</span>
            <span>{formatMoney(data.total, data.currency)}</span>
          </div>
        </div>

        {data.paymentTerms ? (
          <p className="mt-10 border-t border-slate-200 pt-4 text-xs text-[#68727D]">{data.paymentTerms}</p>
        ) : null}
      </div>
    </div>
  );
}
