import type { InvoiceData } from '@/types/invoice';
import { formatInvoiceDate, formatMoney } from '@/components/invoices/format';

/** Template 5 — The Warm Editorial: terracotta, cream, serif headings, pill rows. */
export function WarmEditorialTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="bg-[#FDFBF7] p-12 text-[#3D312A]">
      <div className="text-center">
        <p className="font-serif text-3xl tracking-wide text-[#C86D51] italic">{data.sender.name}</p>
        <div className="mx-auto my-4 h-px w-24 bg-[#C86D51]" />
        <p className="text-xs tracking-[0.2em] text-[#3D312A]/70 uppercase">
          Invoice #{data.invoiceNumber} · Issued {formatInvoiceDate(data.issueDate)} · Due{' '}
          {formatInvoiceDate(data.dueDate)}
        </p>
      </div>

      <div className="my-8 grid grid-cols-2 gap-8 rounded-2xl bg-[#F5EFE6] p-6">
        <div>
          <p className="font-serif text-sm text-[#C86D51] italic">From</p>
          <p className="mt-2 font-medium">{data.sender.name}</p>
          {data.sender.addressLines.map((line) => (
            <p key={line} className="text-sm text-[#3D312A]/70">
              {line}
            </p>
          ))}
        </div>
        <div>
          <p className="font-serif text-sm text-[#C86D51] italic">Billed to</p>
          <p className="mt-2 font-medium">{data.client.name}</p>
          {data.client.addressLines.map((line) => (
            <p key={line} className="text-sm text-[#3D312A]/70">
              {line}
            </p>
          ))}
        </div>
      </div>

      <div>
        {data.lineItems.map((item) => (
          <div
            key={item.id}
            className="mb-2 flex items-center justify-between rounded-xl bg-[#F5EFE6]/60 p-4"
          >
            <div>
              <p className="font-medium">{item.description}</p>
              <p className="text-xs text-[#3D312A]/60">
                {item.quantity} × {formatMoney(item.unitPrice, data.currency)}
              </p>
            </div>
            <p className="font-medium text-[#C86D51]">{formatMoney(item.total, data.currency)}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 ml-auto w-64 space-y-1 text-right">
        <div className="flex justify-between text-sm text-[#3D312A]/70">
          <span>Subtotal</span>
          <span>{formatMoney(data.subtotal, data.currency)}</span>
        </div>
        <div className="flex justify-between text-sm text-[#3D312A]/70">
          <span>Tax ({data.taxRate}%)</span>
          <span>{formatMoney(data.taxAmount, data.currency)}</span>
        </div>
        {data.discount ? (
          <div className="flex justify-between text-sm text-[#3D312A]/70">
            <span>Discount</span>
            <span>-{formatMoney(data.discount, data.currency)}</span>
          </div>
        ) : null}
        <p className="pt-3 font-serif text-sm text-[#C86D51] italic">Total due</p>
        <p className="text-2xl font-bold text-[#C86D51]">{formatMoney(data.total, data.currency)}</p>
      </div>
    </div>
  );
}
