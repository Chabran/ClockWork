import type { OvertimeFee, OvertimePolicy, Rate, RatePeriod, WorkSchedule } from '@/lib/types';

/**
 * Rate periods and the arithmetic that makes them comparable.
 *
 * A freelancer quotes "$800 a day" or "$9k a month", but billing is a function
 * of SECONDS TRACKED. Converting between the two requires knowing how long the
 * freelancer's working day actually is — and that is not a fact about software,
 * it is a fact about the person using it. A 12-hour day is as valid as an
 * 8-hour one, and hard-coding either silently mis-prices the other.
 *
 * So the schedule is DATA (a setting the user owns), never a constant, and
 * every conversion in the app takes it as an argument.
 */

/** New installs start here. Change it in the app, not in the source. */
export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  hoursPerDay: 12,
  daysPerWeek: 5,
  weeksPerYear: 52,
};

/**
 * What versions 1 and 2 of the schema hard-coded (2080 h/year, 8 h/day).
 *
 * Anyone whose data predates this setting had their non-hourly rates priced
 * under these numbers. The migration hands them this schedule — NOT the new
 * default — so their rates keep the meaning they already had.
 */
export const LEGACY_WORK_SCHEDULE: WorkSchedule = {
  hoursPerDay: 8,
  daysPerWeek: 5,
  weeksPerYear: 52,
};

export const PERIOD_LABELS: Record<RatePeriod, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

/** Singular noun for prose: "Amount per week", "12 hours per day". */
export const PERIOD_UNIT: Record<RatePeriod, string> = {
  hourly: 'hour',
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
};

/** Short suffix used next to an amount, e.g. "$95/h". */
export const PERIOD_SUFFIX: Record<RatePeriod, string> = {
  hourly: '/h',
  daily: '/day',
  weekly: '/wk',
  monthly: '/mo',
  yearly: '/yr',
};

export function makeRate(amount: number, period: RatePeriod = 'hourly'): Rate {
  return { amount, period };
}

export function normalizeSchedule(schedule?: Partial<WorkSchedule> | null): WorkSchedule {
  return {
    hoursPerDay: clamp(schedule?.hoursPerDay, DEFAULT_WORK_SCHEDULE.hoursPerDay, 0.5, 24),
    daysPerWeek: clamp(schedule?.daysPerWeek, DEFAULT_WORK_SCHEDULE.daysPerWeek, 1, 7),
    weeksPerYear: clamp(schedule?.weeksPerYear, DEFAULT_WORK_SCHEDULE.weeksPerYear, 1, 52),
  };
}

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Billable hours in each period, derived from the user's schedule.
 *
 * Everything hangs off `hoursPerDay`: a week is days × hours, a year is weeks ×
 * that, and a month is a twelfth of the year — not "four weeks", which
 * undercounts by roughly 8%.
 */
export function billableHours(schedule: WorkSchedule): Record<RatePeriod, number> {
  const safe = normalizeSchedule(schedule);
  const daily = safe.hoursPerDay;
  const weekly = daily * safe.daysPerWeek;
  const yearly = weekly * safe.weeksPerYear;
  return { hourly: 1, daily, weekly, monthly: yearly / 12, yearly };
}

/** Tracked seconds × this = money, whatever period the freelancer quoted in. */
export function toHourlyRate(rate: Rate, schedule: WorkSchedule): number {
  const hours = billableHours(schedule)[rate.period];
  if (!hours) return 0;
  return rate.amount / hours;
}

/** Converts an amount between periods while keeping the hourly value identical. */
export function convertAmount(
  amount: number,
  from: RatePeriod,
  to: RatePeriod,
  schedule: WorkSchedule,
): number {
  const hours = billableHours(schedule);
  const hourly = amount / hours[from];
  return Math.round(hourly * hours[to] * 100) / 100;
}

/**
 * The two directions of "price for this block of time".
 *
 * These live in lib/, not in the dialog, for the same reason as everything else
 * here: money arithmetic should be testable without rendering a component.
 */
export function priceForDuration(seconds: number, hourlyRate: number): number {
  return Math.round((seconds / 3600) * hourlyRate * 100) / 100;
}

/** A total price implies an hourly rate. Zero-length blocks imply nothing. */
export function hourlyFromPrice(price: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return price / (seconds / 3600);
}

/**
 * Overtime, in one function.
 *
 * `hours × hourlyRate × multiplier` — that is the entire feature. Keeping it
 * here rather than in the dialog means the invoice, the table and the totals
 * all compute it the same way, and it can be tested without a browser.
 */
export function overtimeAmount(
  overtime: OvertimeFee | null | undefined,
  hourlyRate: number,
): number {
  const safe = normalizeOvertime(overtime);
  if (!safe) return 0;
  return Math.round(safe.hours * hourlyRate * safe.multiplier * 100) / 100;
}

/** Returns null unless the overtime is real — positive hours and a sane factor. */
export function normalizeOvertime(
  overtime: OvertimeFee | null | undefined,
): OvertimeFee | null {
  if (!overtime) return null;
  const hours = Number(overtime.hours);
  const multiplier = Number(overtime.multiplier);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  if (!Number.isFinite(multiplier) || multiplier <= 0) return null;
  return { hours, multiplier: Math.min(10, multiplier), source: overtime.source ?? 'manual' };
}

export const DEFAULT_OVERTIME_POLICY: OvertimePolicy = {
  enabled: true,
  thresholdHours: 12,
  multiplier: 1.5,
};

export function normalizePolicy(policy?: Partial<OvertimePolicy> | null): OvertimePolicy {
  return {
    enabled: policy?.enabled !== false,
    thresholdHours: clamp(policy?.thresholdHours, DEFAULT_OVERTIME_POLICY.thresholdHours, 0.25, 24),
    multiplier: clamp(policy?.multiplier, DEFAULT_OVERTIME_POLICY.multiplier, 1, 10),
  };
}

/**
 * The automatic rule: anything past the threshold on a single entry is overtime.
 *
 * Returns hours marked `source: 'auto'`, which is what stops them being billed
 * twice — see `splitOvertime` below.
 */
export function autoOvertimeFor(
  trackedSeconds: number,
  policy: OvertimePolicy | null | undefined,
): OvertimeFee | null {
  const safe = normalizePolicy(policy);
  if (!safe.enabled) return null;
  const excess = trackedSeconds / 3600 - safe.thresholdHours;
  // A minute of slop either side of the threshold is not overtime.
  if (excess < 0.02) return null;
  return { hours: Math.round(excess * 100) / 100, multiplier: safe.multiplier, source: 'auto' };
}

/**
 * The one function that decides how overtime affects an entry.
 *
 * THE TRAP this exists to avoid: automatic overtime is carved OUT of hours you
 * already tracked, while manual overtime is extra hours you did not track.
 * Treating both the same way either bills the excess twice (auto) or loses the
 * extra hours entirely (manual). So the source decides:
 *
 *   14 h tracked, threshold 12, ×1.5   →  auto:   12 h regular + 2 h at 1.5
 *                                                 billed hours stay 14
 *   8 h tracked + 2 h typed by hand    →  manual:  8 h regular + 2 h at 1.5
 *                                                 billed hours become 10
 */
export function splitOvertime(
  overtime: OvertimeFee | null | undefined,
  billedSeconds: number,
): { regularSeconds: number; overtimeSeconds: number; totalSeconds: number } {
  const safe = normalizeOvertime(overtime);
  if (!safe) {
    return { regularSeconds: billedSeconds, overtimeSeconds: 0, totalSeconds: billedSeconds };
  }

  const overtimeSeconds = safe.hours * 3600;
  if (safe.source === 'auto') {
    // Already inside the tracked window: re-price it, do not re-count it.
    const regularSeconds = Math.max(0, billedSeconds - overtimeSeconds);
    return {
      regularSeconds,
      overtimeSeconds: Math.min(overtimeSeconds, billedSeconds),
      totalSeconds: billedSeconds,
    };
  }
  // Extra hours that were never tracked: add them on.
  return {
    regularSeconds: billedSeconds,
    overtimeSeconds,
    totalSeconds: billedSeconds + overtimeSeconds,
  };
}

/** "2 h × 1.5" — how an overtime line reads on an invoice. */
export function describeOvertime(overtime: OvertimeFee): string {
  return `${trim(overtime.hours)} h × ${trim(overtime.multiplier)}`;
}

/** "$800/day" — how the rate was quoted, not how it is computed. */
export function formatRate(rate: Rate, currency: string): string {
  const amount = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: rate.amount % 1 === 0 ? 0 : 2,
  }).format(rate.amount);
  return `${amount}${PERIOD_SUFFIX[rate.period]}`;
}

/** "12 h/day · 5 days/week · 52 weeks" — the schedule in one line. */
export function describeSchedule(schedule: WorkSchedule): string {
  const safe = normalizeSchedule(schedule);
  return `${trim(safe.hoursPerDay)} h/day · ${trim(safe.daysPerWeek)} days/week · ${trim(safe.weeksPerYear)} weeks/year`;
}

function trim(n: number): string {
  return String(Math.round(n * 100) / 100);
}
