import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';

/** Template 7 — The Corporate Slate: dense, structured, B2B multi-line billing. */
export function CorporateSlateTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="bg-white p-10 text-[#0F172A]">
      <div className="grid grid-cols-4 divide-x divide-[#CBD5E1] border border-[#CBD5E1] bg-[#F1F5F9] p-3 text-xs">
        <div>
          <p className="text-[#475569] uppercase">Invoice #</p>
          <p className="font-semibold">{data.invoiceNumber}</p>
        </div>
        <div className="pl-3">
          <p className="text-[#475569] uppercase">Issue date</p>
          <p className="font-semibold">{formatInvoiceDate(data.issueDate)}</p>
        </div>
        <div className="pl-3">
          <p className="text-[#475569] uppercase">Due date</p>
          <p className="font-semibold">{formatInvoiceDate(data.dueDate)}</p>
        </div>
        <div className="pl-3">
          <p className="text-[#475569] uppercase">PO / Tax ID</p>
          <p className="font-semibold">{data.poNumber ?? data.taxId ?? '—'}</p>
        </div>
      </div>

      <div className="my-6 grid grid-cols-2 gap-4">
        <div className="border border-[#CBD5E1]">
          <p className="bg-[#475569] px-3 py-1.5 text-xs font-bold text-white uppercase">Vendor / From</p>
          <div className="p-3 text-xs">
            <p className="font-semibold">{data.sender.name}</p>
            {data.sender.addressLines.map((line) => (
              <p key={line} className="text-[#475569]">
                {line}
              </p>
            ))}
          </div>
        </div>
        <div className="border border-[#CBD5E1]">
          <p className="bg-[#475569] px-3 py-1.5 text-xs font-bold text-white uppercase">Customer / Bill to</p>
          <div className="p-3 text-xs">
            <p className="font-semibold">{data.client.name}</p>
            {data.client.addressLines.map((line) => (
              <p key={line} className="text-[#475569]">
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      <table className="w-full border border-[#CBD5E1] text-xs">
        <thead>
          <tr className="bg-[#475569] text-left text-white uppercase">
            <th className="px-2 py-2">Item #</th>
            <th className="px-2 py-2">Description</th>
            <th className="px-2 py-2 text-right">Qty</th>
            <th className="px-2 py-2 text-right">Unit price</th>
            <th className="px-2 py-2 text-right">Line total</th>
          </tr>
        </thead>
        <tbody>
          {data.lineItems.map((item, index) => (
            <tr key={item.id} className="odd:bg-white even:bg-[#F1F5F9]">
              <td className="px-2 py-2 text-[#475569]">{String(index + 1).padStart(2, '0')}</td>
              <td className="px-2 py-2">{item.description}</td>
              <td className="px-2 py-2 text-right">{item.quantity}</td>
              <td className="px-2 py-2 text-right">{formatMoney(item.unitPrice, data.currency)}</td>
              <td className="px-2 py-2 text-right font-semibold">{formatMoney(item.total, data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="border border-[#CBD5E1] p-3 text-xs text-[#475569]">
          <p className="font-bold text-[#0F172A] uppercase">Remittance & terms</p>
          <p className="mt-1">{data.paymentInstructions ?? '—'}</p>
          <p className="mt-1">{data.paymentTerms ?? '—'}</p>
        </div>
        <table className="border border-[#CBD5E1] text-xs">
          <tbody>
            <tr className="border-b border-[#CBD5E1]">
              <td className="px-3 py-2 text-[#475569]">Subtotal</td>
              <td className="px-3 py-2 text-right">{formatMoney(data.subtotal, data.currency)}</td>
            </tr>
            <tr className="border-b border-[#CBD5E1]">
              <td className="px-3 py-2 text-[#475569]">Tax ({data.taxRate}%)</td>
              <td className="px-3 py-2 text-right">{formatMoney(data.taxAmount, data.currency)}</td>
            </tr>
            {data.discount ? (
              <tr className="border-b border-[#CBD5E1]">
                <td className="px-3 py-2 text-[#475569]">Discount</td>
                <td className="px-3 py-2 text-right">-{formatMoney(data.discount, data.currency)}</td>
              </tr>
            ) : null}
            <tr className="bg-[#F1F5F9]">
              <td className="px-3 py-2 font-bold uppercase">Total due</td>
              <td className="px-3 py-2 text-right font-bold">{formatMoney(data.total, data.currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
