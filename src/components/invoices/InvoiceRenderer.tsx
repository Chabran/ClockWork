import type { InvoiceData, TemplateId } from '@/types/invoice';
import type { ColorScheme } from '@/components/invoices/colors';
import { TEMPLATE_REGISTRY } from '@/components/invoices/templates';

/**
 * Wraps whichever template is active in a fixed, print-safe page.
 *
 * `print-color-adjust: exact` (plus the `-webkit-` prefix Chrome/Safari still
 * need) stops the browser from stripping background colors when printing —
 * without it every navy header and colored pill in the gallery above would
 * export as plain white. `templateId` falls back to `executive` if it's ever
 * something outside `TemplateId` (e.g. read from a URL param or stored data),
 * so a bad id renders a real invoice instead of a blank page.
 *
 * `colors` is optional and template-specific (each template has its own set
 * of role names) — omit it and the template renders with its own defaults.
 */
export function InvoiceRenderer({
  templateId,
  data,
  colors,
}: {
  templateId: TemplateId;
  data: InvoiceData;
  colors?: ColorScheme;
}) {
  const Template = TEMPLATE_REGISTRY[templateId] ?? TEMPLATE_REGISTRY.executive;

  return (
    <div
      data-invoice-template={templateId}
      className="mx-auto w-[816px] max-w-full overflow-hidden bg-white text-black shadow-lg [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:w-full print:shadow-none"
    >
      <Template data={data} colors={colors} />
    </div>
  );
}
