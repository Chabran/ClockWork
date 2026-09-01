import { format, parseISO } from 'date-fns';
import type { EnrichedEntry, RoundingRule, Settings } from '@/lib/types';
import { formatMoney } from '@/lib/time/format';
import { describeOvertime, formatRate } from '@/lib/time/rates';
import { ROUNDING_LABELS, toDecimalHours } from '@/lib/time/rounding';
import { sumEntries } from '@/lib/selectors';

export interface PdfOptions {
  settings: Settings;
  rule: RoundingRule;
  /** Human label for the period, e.g. "1–31 Aug 2026". */
  periodLabel: string;
  clientName: string;
}

/**
 * Builds an invoice-ready summary PDF.
 *
 * jsPDF is ~350 KB, so it is imported dynamically: the cost is paid only by the
 * users who actually click Export, not by everyone who loads the dashboard.
 */
export async function exportPdf(entries: EnrichedEntry[], options: PdfOptions): Promise<void> {
  const { default: JsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new JsPDF({ unit: 'pt', format: 'a4' });
  const totals = sumEntries(entries);
  const currency = entries[0]?.currency ?? options.settings.defaultCurrency;
  const marginX = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Timesheet summary', marginX, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(options.settings.invoiceFromName, marginX, 70);
  doc.text(`Client: ${options.clientName}`, marginX, 84);
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
  doc.text(
    `Total due: ${formatMoney(totals.earnings, currency)}`,
    doc.internal.pageSize.getWidth() - marginX,
    finalY,
    { align: 'right' },
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    `Generated ${format(new Date(), 'd MMM yyyy HH:mm')} · ${entries.length} entries`,
    marginX,
    finalY + 20,
  );

  doc.save(`timesheet-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
