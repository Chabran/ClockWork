import { format, isValid, parseISO } from 'date-fns';

/**
 * Timezone policy for the whole app:
 * - Store every instant as a UTC ISO string (`new Date().toISOString()`).
 * - Render with `Intl`/date-fns, which resolve the viewer's local zone.
 * Never store a local-formatted string; you can't recover the instant from it.
 */

/** "01:23:45" — monospaced-friendly clock face for the running timer. */
export function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

/** "2h 05m" — compact human duration for tables and totals. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatTimeOfDay(iso: string | null): string {
  if (!iso) return '—';
  const date = parseISO(iso);
  return isValid(date) ? format(date, 'HH:mm') : '—';
}

export function formatDay(iso: string): string {
  const date = parseISO(iso);
  return isValid(date) ? format(date, 'EEE, d MMM') : '—';
}

/** "yyyy-MM-dd" in LOCAL time — the value shape `<input type="date">` expects. */
export function toDateInputValue(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd');
}

/** "HH:mm" in LOCAL time — the value shape `<input type="time">` expects. */
export function toTimeInputValue(iso: string): string {
  return format(parseISO(iso), 'HH:mm');
}

/** Rebuilds a UTC instant from the local date + time pair a user typed. */
export function fromDateTimeInputs(dateValue: string, timeValue: string): string {
  const [hours = '0', minutes = '0'] = timeValue.split(':');
  const [year = '1970', month = '1', day = '1'] = dateValue.split('-');
  const local = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    0,
    0,
  );
  return local.toISOString();
}
