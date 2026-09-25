'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { InvoiceRenderer } from '@/components/invoices/InvoiceRenderer';
import type { ColorScheme } from '@/components/invoices/colors';
import type { InvoiceData, TemplateId } from '@/types/invoice';

/** The fixed design width every template is built for (see InvoiceRenderer) —
 *  the scale factor below is always relative to this, never guessed. */
const INVOICE_DESIGN_WIDTH = 816;

/**
 * Renders an invoice at its real, full design — the exact pixels the PDF
 * export rasterizes — scaled down as a whole to fit whatever width it's
 * given. That's deliberate: this is a thumbnail of the real thing, not a
 * different "mobile" layout, so what you see here is honestly what
 * exports. Without this, the 816px-wide desktop design either overflows a
 * phone-width container or gets clipped by it — this makes it shrink to
 * fit instead, fully legible at any width.
 */
export function ScaledInvoicePreview({
  templateId,
  data,
  colors,
}: {
  templateId: TemplateId;
  data: InvoiceData;
  colors?: ColorScheme;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const recompute = () => {
      const containerWidth = container.clientWidth;
      // Never scale up past 1 — a thumbnail larger than the real design
      // would look blurry/oversized for no benefit, only shrink to fit.
      const nextScale = containerWidth > 0 ? Math.min(1, containerWidth / INVOICE_DESIGN_WIDTH) : 1;
      setScale(nextScale);
      // scrollHeight is the content's natural (unscaled) height — CSS
      // transform never affects layout size, only paint — so this is
      // exactly the height to reserve once multiplied by the scale.
      setContentHeight(content.scrollHeight);
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [templateId, data, colors]);

  return (
    <div ref={containerRef} className="w-full" style={{ height: contentHeight * scale || undefined }}>
      <div
        ref={contentRef}
        style={{ width: INVOICE_DESIGN_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        <InvoiceRenderer templateId={templateId} data={data} colors={colors} />
      </div>
    </div>
  );
}
