/**
 * Domain model for the freelance time clock.
 *
 * Design rule: this file has ZERO imports. It is the shared vocabulary that the
 * storage layer, the timer engine, and the UI all speak. Keeping it dependency
 * free means any of those layers can be swapped without touching the model.
 */

/** ISO-8601 timestamp with timezone offset, e.g. "2026-09-01T14:03:00.000Z". */
export type IsoDateTime = string;

/** ISO-4217 currency code, e.g. "USD". */
export type CurrencyCode = string;

export const RATE_PERIODS = ['hourly', 'daily', 'weekly', 'monthly', 'yearly'] as const;
export type RatePeriod = (typeof RATE_PERIODS)[number];

/**
 * A rate as the freelancer QUOTES it — "$800 a day", "$9,000 a month".
 *
 * Only the quoted form is stored. The hourly equivalent used for billing is
 * derived through `toHourlyRate()`, never persisted, so the two can never
 * disagree after someone edits one of them.
 */
export interface Rate {
  amount: number;
  period: RatePeriod;
}

/**
 * An overtime surcharge on a single entry.
 *
 * Deliberately the smallest thing that works: extra billable HOURS and the
 * MULTIPLIER they are paid at. Everything else — the amount, how it prints on
 * the invoice, how it rolls into totals — is derived from these two numbers.
 *
 * Absent (undefined or null) means no overtime, so entries written before this
 * field existed stay valid without a migration.
 */
export interface OvertimeFee {
  /** Hours billed at the multiplier. */
  hours: number;
  /** 1.5 = time-and-a-half, 2 = double time. */
  multiplier: number;
  /**
   * Where the hours came from — and therefore whether they ADD to the entry.
   *
   * 'auto'   the hours are part of the tracked window, carved out of it by the
   *          overtime policy. Billed hours do not change; only the price does.
   * 'manual' extra hours you typed that are NOT in the tracked window. They add
   *          to both the hours and the money.
   *
   * Absent means 'manual' — that is what the field meant before policies
   * existed, so old entries keep billing exactly as they did.
   */
  source?: 'auto' | 'manual';
}

/**
 * When overtime kicks in on its own.
 *
 * `thresholdHours` is per ENTRY: any single session longer than this has the
 * excess billed at `multiplier`. Set globally, overridable per client whose
 * contract says something different.
 */
export interface OvertimePolicy {
  enabled: boolean;
  thresholdHours: number;
  multiplier: number;
}

export interface Client {
  id: string;
  name: string;
  /** Fallback rate used when a project or entry does not override it. */
  defaultRate: Rate;
  currency: CurrencyCode;
  /** Tailwind-safe hex used for the client's chip color in the UI. */
  color: string;
  /** Overrides the global overtime policy for this client. Absent = inherit. */
  overtimePolicy?: OvertimePolicy | null;
  archived: boolean;
  createdAt: IsoDateTime;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  /** null => inherit `Client.defaultRate`. */
  rate: Rate | null;
  archived: boolean;
  createdAt: IsoDateTime;
}

export interface TimeEntry {
  id: string;
  clientId: string;
  projectId: string | null;
  /** Free-text task label, e.g. "Landing page revisions". */
  description: string;
  startTime: IsoDateTime;
  /** null while the entry is still running. */
  endTime: IsoDateTime | null;
  /**
   * Committed, billable-clock seconds. Excludes paused time.
   * For a running entry this holds the seconds banked BEFORE the current run
   * segment; the live total is `durationSeconds + (now - startedAt)`.
   */
  durationSeconds: number;
  isBillable: boolean;
  /**
   * HOURLY rate frozen at creation time, so historical invoices never re-price
   * themselves when the client's rate changes.
   */
  rateApplied: number;
  /** The quoted rate this entry was created from, kept for the invoice line. */
  rateQuoted: Rate;
  /** Optional overtime surcharge. Absent means none. */
  overtime?: OvertimeFee | null;
  currency: CurrencyCode;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface TimerState {
  activeEntryId: string | null;
  isRunning: boolean;
  /** Wall-clock start of the CURRENT running segment. null when paused/stopped. */
  startedAt: IsoDateTime | null;
}

export const ROUNDING_RULES = ['exact', 'nearest-6-min', 'nearest-15-min', 'up-15-min'] as const;
export type RoundingRule = (typeof ROUNDING_RULES)[number];

/**
 * How long the user's working day actually is.
 *
 * This is the bridge between a quoted rate ("$1,200 a day") and billable hours.
 * It belongs to the user — a 12-hour day is as real as an 8-hour one — so it is
 * stored, editable, and passed into every conversion rather than assumed.
 */
export interface WorkSchedule {
  hoursPerDay: number;
  daysPerWeek: number;
  weeksPerYear: number;
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  defaultCurrency: CurrencyCode;
  roundingRule: RoundingRule;
  /** Business name printed on the PDF invoice summary. */
  invoiceFromName: string;
  /** Drives every daily/weekly/monthly/yearly → hourly conversion. */
  workSchedule: WorkSchedule;
  /** Default overtime terms; a client may override them. */
  overtimePolicy: OvertimePolicy;
}

/** The single serialized blob the storage adapter reads and writes. */
export interface PersistedState {
  version: number;
  clients: Client[];
  projects: Project[];
  entries: TimeEntry[];
  timer: TimerState;
  settings: Settings;
}

export const SORT_ORDERS = ['newest', 'oldest', 'longest', 'shortest', 'highest'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export interface TimesheetFilters {
  clientId: string | 'all';
  projectId: string | 'all';
  billable: 'all' | 'billable' | 'non-billable';
  /** Inclusive ISO date strings, "yyyy-MM-dd", or null for open-ended. */
  from: string | null;
  to: string | null;
  search: string;
  sort: SortOrder;
}

/** A TimeEntry with the live segment folded in and money computed. */
export interface EnrichedEntry extends TimeEntry {
  clientName: string;
  projectName: string | null;
  /** durationSeconds plus any in-flight running segment. */
  liveSeconds: number;
  /** Rounded tracked time PLUS any overtime hours — the hours you invoice. */
  billedSeconds: number;
  /** Rounded tracked time only, without overtime. */
  baseBilledSeconds: number;
  /** Overtime hours expressed in seconds; 0 when there is none. */
  overtimeSeconds: number;
  /** The overtime actually applied — from the policy or your own override. */
  overtimeApplied: OvertimeFee | null;
  /** hours × rateApplied × multiplier, zero when non-billable or absent. */
  overtimeEarnings: number;
  /** Base earnings plus overtime, zero when non-billable. */
  earnings: number;
  isActive: boolean;
}
