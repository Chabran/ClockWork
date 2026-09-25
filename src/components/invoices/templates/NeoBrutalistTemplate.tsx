import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';

/** Template 3 — The Neo-Brutalist: hard shadows, pure black borders, loud. */
export function NeoBrutalistTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="border-4 border-black bg-white p-8 font-sans text-black">
      <div className="flex justify-between border-2 border-black bg-[#7C3AED] p-6 text-white shadow-[6px_6px_0px_0px_#000000]">
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
        <div className="border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000]">
          <p className="text-xs font-bold uppercase">Client</p>
          <p className="mt-2 font-bold">{data.client.name}</p>
          {data.client.addressLines.map((line) => (
            <p key={line} className="font-mono text-xs">
              {line}
            </p>
          ))}
        </div>
        <div className="border-2 border-black bg-[#FACC15] p-4 text-black shadow-[4px_4px_0px_0px_#000000]">
          <p className="text-xs font-bold uppercase">Invoice meta</p>
          <p className="mt-2 font-mono text-xs">Issued {formatInvoiceDate(data.issueDate)}</p>
          <p className="font-mono text-xs">Due {formatInvoiceDate(data.dueDate)}</p>
          {data.poNumber ? <p className="font-mono text-xs">PO {data.poNumber}</p> : null}
        </div>
      </div>

      <table className="w-full border-2 border-black divide-y-2 divide-black text-sm">
        <thead>
          <tr className="bg-black text-white uppercase">
            <th className="px-3 py-3 text-left font-bold">Description</th>
            <th className="px-3 py-3 text-right font-bold">Qty</th>
            <th className="px-3 py-3 text-right font-bold">Rate</th>
            <th className="px-3 py-3 text-right font-bold">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-black">
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
        <div className="flex justify-between border-2 border-black bg-[#FACC15] p-4 text-xl font-bold shadow-[4px_4px_0px_0px_#000000]">
          <span>TOTAL</span>
          <span>{formatMoney(data.total, data.currency)}</span>
        </div>
      </div>
    </div>
  );
}
