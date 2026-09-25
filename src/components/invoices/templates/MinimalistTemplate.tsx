import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';

/** Template 2 — The Minimalist: clean, airy, no solid color blocks. */
export function MinimalistTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="bg-[#F9F9F9] p-14 font-light text-[#222222]">
      <div className="flex items-end justify-between">
        <p className="text-lg font-medium">{data.sender.name}</p>
        <p className="text-sm text-[#888888]">#{data.invoiceNumber}</p>
      </div>

      <div className="my-12 grid grid-cols-3 gap-8">
        <div>
          <p className="text-[11px] tracking-[0.2em] text-[#888888] uppercase">Billed to</p>
          <p className="mt-2 font-normal">{data.client.name}</p>
          {data.client.addressLines.map((line) => (
            <p key={line} className="text-sm text-[#888888]">
              {line}
            </p>
          ))}
        </div>
        <div>
          <p className="text-[11px] tracking-[0.2em] text-[#888888] uppercase">Issued / Due</p>
          <p className="mt-2 text-sm">{formatInvoiceDate(data.issueDate)}</p>
          <p className="text-sm text-[#888888]">{formatInvoiceDate(data.dueDate)}</p>
        </div>
        <div>
          <p className="text-[11px] tracking-[0.2em] text-[#888888] uppercase">Payment terms</p>
          <p className="mt-2 text-sm text-[#888888]">{data.paymentTerms ?? '—'}</p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E5E5] text-[11px] tracking-[0.2em] text-[#888888] uppercase">
            <th className="pb-3 text-left font-normal">Description</th>
            <th className="pb-3 text-right font-normal">Qty</th>
            <th className="pb-3 text-right font-normal">Rate</th>
            <th className="pb-3 text-right font-normal">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.lineItems.map((item) => (
            <tr key={item.id} className="border-b border-[#E5E5E5]">
              <td className="py-5 font-normal">{item.description}</td>
              <td className="py-5 text-right text-[#888888]">{item.quantity}</td>
              <td className="py-5 text-right text-[#888888]">{formatMoney(item.unitPrice, data.currency)}</td>
              <td className="py-5 text-right font-normal">{formatMoney(item.total, data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto mt-10 w-64 space-y-2 text-right">
        <div className="flex justify-between text-sm text-[#888888]">
          <span>Subtotal</span>
          <span>{formatMoney(data.subtotal, data.currency)}</span>
        </div>
        <div className="flex justify-between text-sm text-[#888888]">
          <span>Tax ({data.taxRate}%)</span>
          <span>{formatMoney(data.taxAmount, data.currency)}</span>
        </div>
        {data.discount ? (
          <div className="flex justify-between text-sm text-[#888888]">
            <span>Discount</span>
            <span>-{formatMoney(data.discount, data.currency)}</span>
          </div>
        ) : null}
        <p className="pt-4 text-[11px] tracking-[0.2em] text-[#888888] uppercase">Total due</p>
        <p className="text-3xl font-light">{formatMoney(data.total, data.currency)}</p>
      </div>
    </div>
  );
}
