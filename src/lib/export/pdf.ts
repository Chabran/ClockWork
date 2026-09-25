import { format, parseISO } from 'date-fns';
import type { jsPDF } from 'jspdf';
import type autoTableFn from 'jspdf-autotable';
import type { EnrichedEntry, RoundingRule, Settings } from '@/lib/types';
import { formatMoney } from '@/lib/time/format';
import { describeOvertime, formatRate } from '@/lib/time/rates';
import { ROUNDING_LABELS, toDecimalHours } from '@/lib/time/rounding';
import { sumEntries } from '@/lib/selectors';
import { invoiceFileName, invoiceLabel, type InvoiceDraft } from '@/lib/export/invoices';

export interface PdfOptions {
  settings: Settings;
  rule: RoundingRule;
  /** Human label for the period, e.g. "1–31 Aug 2026". */
  periodLabel: string;
}

/**
 * 'separate' — one PDF per draft.
 * 'combined' — every draft's entries in one table, one PDF.
 */
export type ExportMode = 'separate' | 'combined';

/**
 * Builds invoice-ready summary PDFs and downloads them.
 *
 * jsPDF is ~350 KB, so it is imported dynamically: the cost is paid only by the
 * users who actually click Export, not by everyone who loads the dashboard.
 * The `import type` lines above are erased at build time and pull in nothing.
 */
export async function exportInvoices(
  drafts: InvoiceDraft[],
  options: PdfOptions,
  mode: ExportMode,
): Promise<void> {
  if (drafts.length === 0) return;

  const { default: JsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const newDoc = () => new JsPDF({ unit: 'pt', format: 'a4' });
  const date = format(new Date(), 'yyyy-MM-dd');

  if (mode === 'combined' || drafts.length === 1) {
    const doc = newDoc();
    const clients = [...new Set(drafts.map((draft) => draft.clientName))].join(', ');
    const label = drafts.length === 1 ? invoiceLabel(drafts[0]!) : clients;
    drawInvoice(doc, autoTable, drafts.flatMap((draft) => draft.entries), label, options);
    doc.save(invoiceFileName(drafts.length === 1 ? label : null, date));
    return;
  }

  /**
   * Several `doc.save()` calls in a row are several browser downloads in a
   * row, and Chrome (and others) silently blocks everything after the first
   * one unless the user has already granted this site "automatic downloads" —
   * there's no prompt to react to, the files just don't arrive. A .zip is one
   * download, so it always goes through, and it's what "separate PDFs" meant
   * anyway: distinct files, not one file per browser permission dialog.
   */
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  // Drafts differ by client, project OR currency, so two can share a label.
  // The currency is appended only on a clash, to keep the common name short.
  const usedNames = new Set<string>();
  for (const draft of drafts) {
    const doc = newDoc();
    const label = invoiceLabel(draft);
    drawInvoice(doc, autoTable, draft.entries, label, options);

    let name = invoiceFileName(label, date);
    if (usedNames.has(name)) name = invoiceFileName(`${label} ${draft.currency}`, date);
    usedNames.add(name);
    zip.file(name, doc.output('arraybuffer'));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `invoices-${date}.zip`);
}

/** Triggers a browser download for a Blob without navigating away. */
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

/** Draws one invoice onto the first page of `doc`. Never saves. */
function drawInvoice(
  doc: jsPDF,
  autoTable: typeof autoTableFn,
  entries: EnrichedEntry[],
  clientLabel: string,
  options: PdfOptions,
): void {
  const totals = sumEntries(entries);
  const marginX = 40;
  const rightX = doc.internal.pageSize.getWidth() - marginX;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Timesheet summary', marginX, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(options.settings.invoiceFromName, marginX, 70);
  doc.text(`Client: ${clientLabel}`, marginX, 84);
  doc.text(`Period: ${options.periodLabel}`, marginX, 98);
  doc.text(`Rounding: ${ROUNDING_LABELS[options.rule]}`, marginX, 112);

  autoTable(doc, {
    startY: 132,
    head: [['Date', 'Client / Project', 'Description', 'Hours', 'Rate', 'Amount']],
    body: entries.map((entry) => [
      format(parseISO(entry.startTime), 'dd MMM'),
      `${entry.clientName}${entry.projectName ? ` · ${entry.projectName}` : ''}`,
      [
        entry.description || '—',
        entry.isBillable ? '' : '  (non-billable)',
        // Overtime prints as its own line under the description, so the client
        // can see exactly what the surcharge was for.
        entry.overtimeApplied
          ? `\nIncludes ${describeOvertime(entry.overtimeApplied)} overtime = ${formatMoney(entry.overtimeEarnings, entry.currency)}`
          : '',
      ].join(''),
      toDecimalHours(entry.billedSeconds).toFixed(2),
      formatRate(entry.rateQuoted, entry.currency),
      entry.isBillable ? formatMoney(entry.earnings, entry.currency) : '—',
    ]),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [246, 247, 251] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    margin: { left: marginX, right: marginX },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20);
  const hoursLine =
    totals.overtimeSeconds > 0
      ? `Billable hours: ${toDecimalHours(totals.billedSeconds).toFixed(2)} (incl. ${toDecimalHours(totals.overtimeSeconds).toFixed(2)} overtime)`
      : `Billable hours: ${toDecimalHours(totals.billedSeconds).toFixed(2)}`;
  doc.text(hoursLine, marginX, finalY);

  // Money never sums across currencies: a combined invoice spanning USD and
  // EUR gets one "Total due" line per currency.
  const currencies = [...new Set(entries.map((entry) => entry.currency))];
  currencies.forEach((currency, index) => {
    const due = sumEntries(entries.filter((entry) => entry.currency === currency)).earnings;
    const label = currencies.length > 1 ? `Total due (${currency})` : 'Total due';
    doc.text(`${label}: ${formatMoney(due, currency)}`, rightX, finalY + index * 16, {
      align: 'right',
    });
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    `Generated ${format(new Date(), 'd MMM yyyy HH:mm')} · ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`,
    marginX,
    finalY + (currencies.length - 1) * 16 + 20,
  );
}
