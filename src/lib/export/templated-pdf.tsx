import { format } from 'date-fns';
import type { jsPDF } from 'jspdf';
import type { InvoiceData, TemplateId } from '@/types/invoice';
import type { ColorScheme } from '@/components/invoices/colors';

/**
 * Exports invoices using one of the template gallery's designs — a real,
 * downloadable PDF that matches what the template picker previewed.
 *
 * jsPDF (used by `exportInvoices` in ./pdf.ts, for invoices that never went
 * through the template gallery) draws its own primitives and can't reproduce
 * arbitrary CSS. This instead renders the SAME React component the picker
 * previews to an off-screen element, rasterizes it with html2canvas, and
 * drops the image into a real PDF page — so what you saw is what you get,
 * not a re-implementation of it.
 */
export async function exportTemplatedInvoices(
  items: InvoiceData[],
  templateId: TemplateId,
  colors?: ColorScheme,
): Promise<void> {
  if (items.length === 0) return;

  const { default: JsPDF } = await import('jspdf');
  const date = format(new Date(), 'yyyy-MM-dd');

  if (items.length === 1) {
    const doc = new JsPDF({ unit: 'mm', format: 'a4' });
    const canvas = await renderInvoiceToCanvas(items[0]!, templateId, colors);
    addCanvasPages(doc, canvas);
    doc.save(`${items[0]!.invoiceNumber}.pdf`);
    return;
  }

  // Several PDFs downloading in a row get silently blocked by the browser
  // after the first — same reasoning as the jsPDF "separate" path in ./pdf.ts.
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const item of items) {
    const doc = new JsPDF({ unit: 'mm', format: 'a4' });
    const canvas = await renderInvoiceToCanvas(item, templateId, colors);
    addCanvasPages(doc, canvas);
    let name = `${item.invoiceNumber}.pdf`;
    if (usedNames.has(name)) name = `${item.invoiceNumber}-${Math.random().toString(36).slice(2, 6)}.pdf`;
    usedNames.add(name);
    zip.file(name, doc.output('arraybuffer'));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `invoices-${date}.zip`);
}

/**
 * Renders one InvoiceRenderer off-screen (fixed pixel width, matching the
 * template's own layout width) and rasterizes it. Off-screen rather than
 * `display: none` — html2canvas needs the element actually laid out and
 * painted, which a hidden element never is.
 */
async function renderInvoiceToCanvas(
  data: InvoiceData,
  templateId: TemplateId,
  colors: ColorScheme | undefined,
): Promise<HTMLCanvasElement> {
  const [{ createRoot }, { default: html2canvas }, { InvoiceRenderer }] = await Promise.all([
    import('react-dom/client'),
    import('html2canvas'),
    import('@/components/invoices/InvoiceRenderer'),
  ]);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-99999px';
  container.style.zIndex = '-1';
  container.style.background = '#ffffff';
  document.body.appendChild(container);

  const root = createRoot(container);
  await new Promise<void>((resolve) => {
    root.render(<InvoiceRenderer templateId={templateId} data={data} colors={colors} />);
    // Two frames: one for React to commit, one for layout/paint to settle
    // before html2canvas walks the DOM.
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  // Without this, html2canvas can capture before the app's web font
  // (Geist, loaded via next/font) finishes loading and silently rasterizes
  // the fallback system font instead — same layout, wrong typeface.
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  try {
    const target = (container.firstElementChild as HTMLElement) ?? container;
    return await html2canvas(target, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });
  } finally {
    root.unmount();
    container.remove();
  }
}

/** Places a rasterized invoice across as many A4 pages as its height needs. */
function addCanvasPages(doc: jsPDF, canvas: HTMLCanvasElement): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/png');

  let heightLeft = imgHeight;
  let position = 0;

  doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    doc.addPage();
    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
