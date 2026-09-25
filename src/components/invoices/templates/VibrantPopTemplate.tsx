import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';

/** Template 8 — The Vibrant Pop: playful, coral & yellow, rounded everything. */
export function VibrantPopTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="relative overflow-hidden bg-white p-10 text-[#1E293B]">
      <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-[#FFD93D]" />

      <div className="relative">
        <span className="inline-block rounded-2xl bg-[#FF6B6B] px-6 py-3 text-2xl font-extrabold tracking-tight text-white">
          Invoice
        </span>
        <p className="mt-3 text-sm font-bold text-[#1E293B]/60">
          #{data.invoiceNumber} · Issued {formatInvoiceDate(data.issueDate)} · Due {formatInvoiceDate(data.dueDate)}
        </p>
      </div>

      <div className="relative z-10 mt-8 grid grid-cols-2 gap-6">
        <div className="rounded-2xl border-l-4 border-[#FF6B6B] bg-slate-50 p-5">
          <p className="text-xs font-extrabold text-[#FF6B6B] uppercase">From</p>
          <p className="mt-1 font-bold">{data.sender.name}</p>
          {data.sender.addressLines.map((line) => (
            <p key={line} className="text-sm text-[#1E293B]/60">
              {line}
            </p>
          ))}
        </div>
        <div className="rounded-2xl border-l-4 border-[#FF6B6B] bg-slate-50 p-5">
          <p className="text-xs font-extrabold text-[#FF6B6B] uppercase">Billed to</p>
          <p className="mt-1 font-bold">{data.client.name}</p>
          {data.client.addressLines.map((line) => (
            <p key={line} className="text-sm text-[#1E293B]/60">
              {line}
            </p>
          ))}
        </div>
      </div>

      <table className="mt-8 w-full overflow-hidden text-sm">
        <thead>
          <tr className="rounded-xl bg-[#FFD93D] font-bold text-slate-900">
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
              <td className="px-4 py-4 text-right text-[#1E293B]/60">{item.quantity}</td>
              <td className="px-4 py-4 text-right text-[#1E293B]/60">
                {formatMoney(item.unitPrice, data.currency)}
              </td>
              <td className="px-4 py-4 text-right font-bold">{formatMoney(item.total, data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 ml-auto w-72 space-y-1">
        <div className="flex justify-between text-sm text-[#1E293B]/60">
          <span>Subtotal</span>
          <span>{formatMoney(data.subtotal, data.currency)}</span>
        </div>
        <div className="flex justify-between text-sm text-[#1E293B]/60">
          <span>Tax ({data.taxRate}%)</span>
          <span>{formatMoney(data.taxAmount, data.currency)}</span>
        </div>
        {data.discount ? (
          <div className="flex justify-between text-sm text-[#1E293B]/60">
            <span>Discount</span>
            <span>-{formatMoney(data.discount, data.currency)}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#FF6B6B] p-6 text-2xl font-black text-white">
        <span>Total</span>
        <span>{formatMoney(data.total, data.currency)}</span>
      </div>
    </div>
  );
}
