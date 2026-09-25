import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';

/** Template 9 — The Monochromatic Grid: architectural blueprint, strict mono. */
export function MonochromaticGridTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="divide-y divide-black border border-black bg-white font-mono text-black">
      {/* Cell 1 — header */}
      <div className="grid grid-cols-2 divide-x divide-black">
        <div className="p-6">
          <span className="mb-2 block text-[10px] text-[#9CA3AF] uppercase">[00 // SENDER]</span>
          <p className="text-sm font-bold">{data.sender.name}</p>
          {data.sender.addressLines.map((line) => (
            <p key={line} className="text-xs text-[#9CA3AF]">
              {line}
            </p>
          ))}
        </div>
        <div className="p-6">
          <span className="mb-2 block text-[10px] text-[#9CA3AF] uppercase">[DOC // INDEX]</span>
          <p className="text-sm font-bold">{data.invoiceNumber}</p>
          <p className="text-xs text-[#9CA3AF]">ISSUED {formatInvoiceDate(data.issueDate)}</p>
          <p className="text-xs text-[#9CA3AF]">DUE {formatInvoiceDate(data.dueDate)}</p>
          {data.poNumber ? <p className="text-xs text-[#9CA3AF]">PO {data.poNumber}</p> : null}
        </div>
      </div>

      {/* Cell 2 — parties */}
      <div className="grid grid-cols-2 divide-x divide-black">
        <div className="p-6">
          <span className="mb-2 block text-[10px] text-[#9CA3AF] uppercase">[01 // CLIENT_DATA]</span>
          <p className="text-sm font-bold">{data.client.name}</p>
          {data.client.addressLines.map((line) => (
            <p key={line} className="text-xs text-[#9CA3AF]">
              {line}
            </p>
          ))}
        </div>
        <div className="p-6">
          <span className="mb-2 block text-[10px] text-[#9CA3AF] uppercase">[02 // REMITTANCE]</span>
          <p className="text-xs text-[#9CA3AF]">{data.paymentInstructions ?? '—'}</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">{data.paymentTerms ?? '—'}</p>
        </div>
      </div>

      {/* Cell 3 — items */}
      <table className="w-full text-xs">
        <thead>
          <tr className="divide-x divide-black border-b border-black">
            <th className="p-3 text-left">DESCRIPTION</th>
            <th className="p-3 text-right">QTY</th>
            <th className="p-3 text-right">RATE</th>
            <th className="p-3 text-right">AMOUNT</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black">
          {data.lineItems.map((item) => (
            <tr key={item.id} className="divide-x divide-black">
              <td className="p-3">{item.description}</td>
              <td className="p-3 text-right">{item.quantity}</td>
              <td className="p-3 text-right">{formatMoney(item.unitPrice, data.currency)}</td>
              <td className="p-3 text-right">{formatMoney(item.total, data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Cell 4 — totals */}
      <div className="flex justify-end">
        <div className="w-full max-w-xs space-y-1 p-3 text-xs text-[#9CA3AF] sm:w-1/2">
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
        </div>
        <div className="bg-black p-6 text-white">
          <p className="text-xs text-white/60 uppercase">Total due</p>
          <p className="text-xl font-bold">{formatMoney(data.total, data.currency)}</p>
        </div>
      </div>
    </div>
  );
}
