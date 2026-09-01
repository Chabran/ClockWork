import { format, parseISO } from 'date-fns';
import type { EnrichedEntry, RoundingRule } from '@/lib/types';
import { toDecimalHours } from '@/lib/time/rounding';
import { formatRate } from '@/lib/time/rates';
import { ROUNDING_LABELS } from '@/lib/time/rounding';

const HEADERS = [
  'Date',
  'Client',
  'Project',
  'Description',
  'Start',
  'End',
  'Tracked hours',
  'Billed hours',
  'Billable',
  'Rate (quoted)',
  'Rate (hourly)',
  'Overtime hours',
  'Overtime multiplier',
  'Overtime amount',
  'Currency',
  'Amount',
] as const;

/**
 * RFC-4180 quoting. Every field is wrapped and inner quotes are doubled.
 * Skipping this is the classic export bug: one client named `Acme, Inc.` and
 * every downstream column silently shifts by one.
 */
function escapeField(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildCsv(entries: EnrichedEntry[], rule: RoundingRule): string {
  const rows = entries.map((entry) =>
    [
      format(parseISO(entry.startTime), 'yyyy-MM-dd'),
      entry.clientName,
      entry.projectName ?? '',
      entry.description,
      format(parseISO(entry.startTime), 'HH:mm'),
      entry.endTime ? format(parseISO(entry.endTime), 'HH:mm') : '',
      toDecimalHours(entry.liveSeconds),
      toDecimalHours(entry.billedSeconds),
      entry.isBillable ? 'Yes' : 'No',
      formatRate(entry.rateQuoted, entry.currency),
      entry.rateApplied,
      entry.overtimeApplied?.hours ?? '',
      entry.overtimeApplied?.multiplier ?? '',
      entry.overtimeApplied ? entry.overtimeEarnings.toFixed(2) : '',
      entry.currency,
      entry.earnings.toFixed(2),
    ]
      .map(escapeField)
      .join(','),
  );

  const meta = `# Exported ${format(new Date(), 'yyyy-MM-dd HH:mm')} · Rounding: ${ROUNDING_LABELS[rule]}`;
  return [meta, HEADERS.map(escapeField).join(','), ...rows].join('\r\n');
}

/** Triggers a browser download without touching the DOM permanently. */
export function downloadBlob(content: BlobPart, filename: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCsv(entries: EnrichedEntry[], rule: RoundingRule): void {
  const filename = `timesheet-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  // The BOM makes Excel open UTF-8 correctly instead of mangling accents.
  downloadBlob('﻿' + buildCsv(entries, rule), filename, 'text/csv;charset=utf-8;');
}
