/**
 * Data contract for the invoice template gallery.
 *
 * Deliberately separate from `@/lib/types` (the time-tracking domain model):
 * the templates are being designed and reviewed against fixed mock data
 * before any of this is wired to real timesheet entries, so this shape can
 * change freely without touching the app's actual data. Zero imports, same
 * rule as the domain model — any template can depend on this without
 * dragging in the rest of the app.
 */

export const TEMPLATE_IDS = [
  'executive',
  'minimalist',
  'neo-brutalist',
  'sidebar-split',
  'warm-editorial',
  'vibrant-pop',
  'luxe-gold',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

/** A billing party — either side of the invoice. Address is pre-split into
 *  display lines so templates never have to parse a blob of text. */
export interface InvoiceParty {
  name: string;
  addressLines: string[];
  email?: string;
  phone?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  /** Always `quantity * unitPrice`. Stored rather than computed so every
   *  template renders the same number without re-implementing the math. */
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  status: InvoiceStatus;
  /** ISO-8601 date, e.g. "2026-09-25". */
  issueDate: string;
  dueDate: string;
  poNumber?: string;
  taxId?: string;
  /** ISO-4217 currency code, e.g. "USD". */
  currency: string;
  sender: InvoiceParty;
  client: InvoiceParty;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount?: number;
  total: number;
  paymentTerms?: string;
  paymentInstructions?: string;
  notes?: string;
}

/** Realistic sample data every template renders against, so the switcher
 *  is a true side-by-side comparison rather than 10 empty boxes. */
export const MOCK_INVOICE_DATA: InvoiceData = {
  invoiceNumber: 'INV-2026-0143',
  status: 'sent',
  issueDate: '2026-09-25',
  dueDate: '2026-10-25',
  poNumber: 'PO-88214',
  taxId: 'US-TAX-77291045',
  currency: 'USD',
  sender: {
    name: 'Atlas Freelance Studio',
    addressLines: ['1420 Harbor View Ave', 'Suite 210', 'San Juan, PR 00907'],
    email: 'billing@atlasfreelance.co',
    phone: '+1 (787) 555-0142',
  },
  client: {
    name: 'Northwind Studio',
    addressLines: ['88 Meridian Plaza', 'Floor 6', 'Austin, TX 78701'],
    email: 'accounts@northwindstudio.com',
    phone: '+1 (512) 555-0199',
  },
  lineItems: [
    { id: '1', description: 'On-set lighting & electric — 3-day feature shoot', quantity: 24, unitPrice: 95, total: 2280 },
    { id: '2', description: 'Gaffer pre-light & rig design', quantity: 8, unitPrice: 110, total: 880 },
    { id: '3', description: 'Grip package rental (day rate)', quantity: 3, unitPrice: 180, total: 540 },
    { id: '4', description: 'Video village setup & monitoring', quantity: 6, unitPrice: 85, total: 510 },
    { id: '5', description: 'Wrap, strike & equipment return', quantity: 4, unitPrice: 95, total: 380 },
  ],
  subtotal: 4590,
  taxRate: 7.5,
  taxAmount: 344.25,
  discount: 100,
  total: 4834.25,
  paymentTerms: 'Net 30 — due within 30 days of issue date',
  paymentInstructions: 'Wire transfer to Atlas Freelance Studio · Routing 021000021 · Account 4400 8827 1190',
  notes: 'Thank you for the opportunity — great crew, great set. Looking forward to the next one.',
};
