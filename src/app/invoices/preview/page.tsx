import type { Metadata } from 'next';
import { TemplateSwitcher } from '@/components/invoices/TemplateSwitcher';
import { MOCK_INVOICE_DATA } from '@/types/invoice';

export const metadata: Metadata = {
  title: 'Invoice templates — Clockwork',
  description: 'Preview and export every invoice template against sample data.',
};

/**
 * A dedicated gallery route, separate from the real export flow in
 * `/timesheet`, so templates can be designed and reviewed against fixed mock
 * data before any of this touches real timesheet entries.
 */
export default function InvoiceTemplatesPreviewPage() {
  return <TemplateSwitcher data={MOCK_INVOICE_DATA} />;
}
