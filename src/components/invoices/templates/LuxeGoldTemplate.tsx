import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';

/** Template 10 — The Luxe Gold: high-end, espresso & gold, double-frame border. */
export function LuxeGoldTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="border-[12px] border-[#2C221E] bg-[#FAF8F5] p-12 text-[#2C221E]">
      <div className="h-full border border-[#C5A059] p-8">
        <div className="text-center">
          <p className="font-serif text-2xl tracking-[0.3em] text-[#2C221E] uppercase">{data.sender.name}</p>
          <div className="my-4 border-y border-[#C5A059] py-2 text-center text-xs tracking-[0.2em] text-[#C5A059]">
            Invoice #{data.invoiceNumber}
          </div>
        </div>

        <div className="my-8 grid grid-cols-2 gap-8">
          <div>
            <p className="text-[10px] tracking-widest text-[#C5A059] uppercase">Billed to</p>
            <p className="mt-2 font-medium">{data.client.name}</p>
            {data.client.addressLines.map((line) => (
              <p key={line} className="text-sm text-[#2C221E]/70">
                {line}
              </p>
            ))}
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-widest text-[#C5A059] uppercase">Issue date</p>
            <p className="text-sm">{formatInvoiceDate(data.issueDate)}</p>
            <p className="mt-2 text-[10px] tracking-widest text-[#C5A059] uppercase">Due date</p>
            <p className="text-sm">{formatInvoiceDate(data.dueDate)}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#C5A059] text-[10px] tracking-widest text-[#C5A059] uppercase">
              <th className="pb-2 text-left font-normal">Description</th>
              <th className="pb-2 text-right font-normal">Qty</th>
              <th className="pb-2 text-right font-normal">Rate</th>
              <th className="pb-2 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item) => (
              <tr key={item.id} className="border-b border-[#E6DEC8]">
                <td className="py-3">{item.description}</td>
                <td className="py-3 text-right text-[#2C221E]/70">{item.quantity}</td>
                <td className="py-3 text-right text-[#2C221E]/70">{formatMoney(item.unitPrice, data.currency)}</td>
                <td className="py-3 text-right font-medium">{formatMoney(item.total, data.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 ml-auto w-72 border border-[#C5A059] bg-[#2C221E] p-6 text-[#FAF8F5]">
          <div className="flex justify-between text-xs text-[#FAF8F5]/70">
            <span>Subtotal</span>
            <span>{formatMoney(data.subtotal, data.currency)}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-[#FAF8F5]/70">
            <span>Tax ({data.taxRate}%)</span>
            <span>{formatMoney(data.taxAmount, data.currency)}</span>
          </div>
          {data.discount ? (
            <div className="mt-1 flex justify-between text-xs text-[#FAF8F5]/70">
              <span>Discount</span>
              <span>-{formatMoney(data.discount, data.currency)}</span>
            </div>
          ) : null}
          <div className="mt-3 flex items-baseline justify-between border-t border-[#C5A059]/40 pt-3">
            <span className="text-xs tracking-widest uppercase">Total due</span>
            <span className="font-serif text-2xl text-[#C5A059]">{formatMoney(data.total, data.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
