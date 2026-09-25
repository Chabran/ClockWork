import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';

/** Template 6 — The Tech Dark: dark-mode elegant, cyan accents, monospace figures. */
export function TechDarkTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="bg-[#0F172A] p-10 text-[#F8FAFC]">
      <div className="mb-8 h-1 w-full bg-gradient-to-r from-[#38BDF8] to-indigo-500" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold">{data.sender.name}</p>
          {data.sender.addressLines.map((line) => (
            <p key={line} className="text-xs text-[#94A3B8]">
              {line}
            </p>
          ))}
        </div>
        <div className="rounded-lg border border-slate-700 bg-[#1E293B] p-4 font-mono text-sm">
          <p className="text-[#38BDF8]">#{data.invoiceNumber}</p>
          <p className="mt-1 text-xs text-[#94A3B8]">Issued {formatInvoiceDate(data.issueDate)}</p>
          <p className="text-xs text-[#94A3B8]">Due {formatInvoiceDate(data.dueDate)}</p>
        </div>
      </div>

      <div className="my-8 overflow-hidden rounded-xl border border-slate-700/80 bg-[#1E293B]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900/60 font-mono text-xs text-[#38BDF8] uppercase">
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item) => (
              <tr key={item.id} className="border-t border-slate-700/60">
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3 text-right font-mono text-[#94A3B8]">{item.quantity}</td>
                <td className="px-4 py-3 text-right font-mono text-[#94A3B8]">
                  {formatMoney(item.unitPrice, data.currency)}
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatMoney(item.total, data.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto w-72 rounded-xl border border-[#38BDF8]/40 bg-[#1E293B] p-6">
        <div className="flex justify-between font-mono text-xs text-[#94A3B8]">
          <span>Subtotal</span>
          <span>{formatMoney(data.subtotal, data.currency)}</span>
        </div>
        <div className="mt-1 flex justify-between font-mono text-xs text-[#94A3B8]">
          <span>Tax ({data.taxRate}%)</span>
          <span>{formatMoney(data.taxAmount, data.currency)}</span>
        </div>
        {data.discount ? (
          <div className="mt-1 flex justify-between font-mono text-xs text-[#94A3B8]">
            <span>Discount</span>
            <span>-{formatMoney(data.discount, data.currency)}</span>
          </div>
        ) : null}
        <div className="mt-3 border-t border-slate-700 pt-3">
          <p className="text-xs text-[#94A3B8] uppercase">Total amount</p>
          <p className="font-mono text-2xl font-bold text-[#38BDF8]">{formatMoney(data.total, data.currency)}</p>
        </div>
      </div>
    </div>
  );
}
