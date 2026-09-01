import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type {
  Client,
  EnrichedEntry,
  PersistedState,
  Project,
  RoundingRule,
  TimeEntry,
  TimerState,
  TimesheetFilters,
  SortOrder,
  OvertimePolicy,
} from '@/lib/types';
import { applyRounding, calculateEarnings } from '@/lib/time/rounding';
import { autoOvertimeFor, normalizeOvertime, overtimeAmount, splitOvertime } from '@/lib/time/rates';

/**
 * Derived data lives here as pure functions — never in component state.
 *
 * Rule of thumb: if a value can be computed from what you already store, do not
 * store it. Stored duplicates drift; computed values cannot.
 */

export function liveSecondsFor(entry: TimeEntry, timer: TimerState, nowMs: number): number {
  const isActive = timer.activeEntryId === entry.id && timer.isRunning && timer.startedAt !== null;
  if (!isActive) return entry.durationSeconds;
  const segment = (nowMs - parseISO(timer.startedAt as string).getTime()) / 1000;
  return entry.durationSeconds + Math.max(0, segment);
}

export function enrichEntry(
  entry: TimeEntry,
  clients: Client[],
  projects: Project[],
  timer: TimerState,
  rule: RoundingRule,
  nowMs: number,
  globalPolicy?: OvertimePolicy,
): EnrichedEntry {
  const liveSeconds = liveSecondsFor(entry, timer, nowMs);
  const rounded = applyRounding(liveSeconds, rule);
  const client = clients.find((c) => c.id === entry.clientId);

  /**
   * Overtime comes from ONE of two places, and an override always wins:
   *   entry.overtime present  → the user decided, even if it says zero hours
   *   entry.overtime absent   → the policy decides, automatically
   * A client's policy overrides the global one.
   */
  const policy = client?.overtimePolicy ?? globalPolicy;
  const overtimeApplied =
    entry.overtime !== undefined && entry.overtime !== null
      ? normalizeOvertime(entry.overtime)
      : autoOvertimeFor(rounded, policy);

  const split = splitOvertime(overtimeApplied, rounded);
  const overtimeEarnings = entry.isBillable
    ? overtimeAmount(overtimeApplied, entry.rateApplied)
    : 0;

  return {
    ...entry,
    clientName: client?.name ?? 'Unassigned',
    projectName: projects.find((p) => p.id === entry.projectId)?.name ?? null,
    liveSeconds,
    baseBilledSeconds: split.regularSeconds,
    billedSeconds: split.totalSeconds,
    overtimeSeconds: split.overtimeSeconds,
    overtimeApplied,
    overtimeEarnings,
    earnings:
      calculateEarnings(split.regularSeconds, entry.rateApplied, entry.isBillable) +
      overtimeEarnings,
    isActive: timer.activeEntryId === entry.id,
  };
}

export function enrichAll(state: PersistedState, nowMs: number): EnrichedEntry[] {
  return state.entries
    .map((entry) =>
      enrichEntry(
        entry,
        state.clients,
        state.projects,
        state.timer,
        state.settings.roundingRule,
        nowMs,
        state.settings.overtimePolicy,
      ),
    )
    .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime());
}

export function filterEntries(entries: EnrichedEntry[], filters: TimesheetFilters): EnrichedEntry[] {
  const needle = filters.search.trim().toLowerCase();

  return entries.filter((entry) => {
    if (filters.clientId !== 'all' && entry.clientId !== filters.clientId) return false;
    if (filters.projectId !== 'all' && entry.projectId !== filters.projectId) return false;
    if (filters.billable === 'billable' && !entry.isBillable) return false;
    if (filters.billable === 'non-billable' && entry.isBillable) return false;

    const started = parseISO(entry.startTime);
    if (filters.from && started < startOfDay(parseISO(filters.from))) return false;
    if (filters.to && started > endOfDay(parseISO(filters.to))) return false;

    if (needle) {
      const haystack = `${entry.description} ${entry.clientName} ${entry.projectName ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

/**
 * The job titles you have used before, most recent first, no duplicates.
 *
 * Derived from the entries themselves rather than kept in a separate list —
 * there is no way for the two to fall out of step, deleting the last entry with
 * a title removes it from the picker, and it costs nothing to store. (§4.)
 *
 * Matching is case-insensitive so "Site build" and "site build" collapse to the
 * one you typed most recently, but the original casing is what gets offered.
 */
export function recentJobTitles(entries: EnrichedEntry[], limit = 12): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];

  // `entries` arrives newest-first from enrichAll, so the first sighting of a
  // title is the most recent use of it.
  for (const entry of entries) {
    const title = entry.description.trim();
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(title);
    if (titles.length >= limit) break;
  }
  return titles;
}

export const SORT_LABELS: Record<SortOrder, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  longest: 'Longest first',
  shortest: 'Shortest first',
  highest: 'Highest amount',
};

/**
 * Sorting is a view concern, so it happens here rather than in stored state.
 * `enrichAll` already returns newest-first; this re-orders that list.
 */
export function sortEntries(entries: EnrichedEntry[], order: SortOrder): EnrichedEntry[] {
  const byStart = (a: EnrichedEntry, b: EnrichedEntry) =>
    parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime();

  const sorted = [...entries];
  switch (order) {
    case 'oldest':
      return sorted.sort(byStart);
    case 'longest':
      return sorted.sort((a, b) => b.liveSeconds - a.liveSeconds || byStart(b, a));
    case 'shortest':
      return sorted.sort((a, b) => a.liveSeconds - b.liveSeconds || byStart(b, a));
    case 'highest':
      return sorted.sort((a, b) => b.earnings - a.earnings || byStart(b, a));
    case 'newest':
    default:
      return sorted.sort((a, b) => byStart(b, a));
  }
}

export interface PeriodTotals {
  seconds: number;
  /** Rounded tracked hours plus overtime — what the invoice bills. */
  billedSeconds: number;
  overtimeSeconds: number;
  overtimeEarnings: number;
  earnings: number;
  entryCount: number;
}

const EMPTY_TOTALS: PeriodTotals = {
  seconds: 0,
  billedSeconds: 0,
  overtimeSeconds: 0,
  overtimeEarnings: 0,
  earnings: 0,
  entryCount: 0,
};

export function sumEntries(entries: EnrichedEntry[]): PeriodTotals {
  return entries.reduce<PeriodTotals>(
    (acc, entry) => ({
      seconds: acc.seconds + entry.liveSeconds,
      billedSeconds: acc.billedSeconds + entry.billedSeconds,
      overtimeSeconds: acc.overtimeSeconds + entry.overtimeSeconds,
      overtimeEarnings: acc.overtimeEarnings + entry.overtimeEarnings,
      earnings: acc.earnings + entry.earnings,
      entryCount: acc.entryCount + 1,
    }),
    { ...EMPTY_TOTALS },
  );
}

function within(entry: EnrichedEntry, start: Date, end: Date): boolean {
  return isWithinInterval(parseISO(entry.startTime), { start, end });
}

export interface DashboardTotals {
  today: PeriodTotals;
  week: PeriodTotals;
  month: PeriodTotals;
}

export function periodTotals(entries: EnrichedEntry[], now: Date): DashboardTotals {
  const weekOptions = { weekStartsOn: 1 } as const; // ISO weeks: Monday start
  return {
    today: sumEntries(entries.filter((e) => within(e, startOfDay(now), endOfDay(now)))),
    week: sumEntries(
      entries.filter((e) => within(e, startOfWeek(now, weekOptions), endOfWeek(now, weekOptions))),
    ),
    month: sumEntries(entries.filter((e) => within(e, startOfMonth(now), endOfMonth(now)))),
  };
}

export interface ClientBreakdownRow extends PeriodTotals {
  clientId: string;
  clientName: string;
  color: string;
  currency: string;
}

export function clientBreakdown(entries: EnrichedEntry[], clients: Client[]): ClientBreakdownRow[] {
  const byClient = new Map<string, EnrichedEntry[]>();
  for (const entry of entries) {
    const bucket = byClient.get(entry.clientId);
    if (bucket) bucket.push(entry);
    else byClient.set(entry.clientId, [entry]);
  }

  return [...byClient.entries()]
    .map(([clientId, list]) => {
      const client = clients.find((c) => c.id === clientId);
      return {
        clientId,
        clientName: client?.name ?? 'Unassigned',
        color: client?.color ?? '#94a3b8',
        currency: client?.currency ?? list[0]?.currency ?? 'USD',
        ...sumEntries(list),
      };
    })
    .sort((a, b) => b.earnings - a.earnings || b.seconds - a.seconds);
}
