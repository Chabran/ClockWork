/**
 * Pure-logic tests. Run with: npm test
 *
 * Only the reducer and the money/rounding math are tested here — they are the
 * parts where a bug silently changes what a client gets invoiced. UI is easy to
 * eyeball; arithmetic is not.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { applyRounding, calculateEarnings, toDecimalHours } from '@/lib/time/rounding';
import { timeTrackerReducer } from '@/hooks/timeTrackerReducer';
import { createEmptyState } from '@/lib/defaults';
import { migrate } from '@/lib/storage/migrations';
import { recentJobTitles, sortEntries } from '@/lib/selectors';
import type { EnrichedEntry } from '@/lib/types';
import { groupIntoInvoices, invoiceFileName, invoiceLabel } from '@/lib/export/invoices';
import {
  DEFAULT_WORK_SCHEDULE,
  LEGACY_WORK_SCHEDULE,
  billableHours,
  convertAmount,
  formatRate,
  hourlyFromPrice,
  normalizeSchedule,
  autoOvertimeFor,
  normalizeOvertime,
  normalizePolicy,
  overtimeAmount,
  splitOvertime,
  priceForDuration,
  toHourlyRate,
} from '@/lib/time/rates';

test('rounding: exact keeps whole seconds', () => {
  assert.equal(applyRounding(3661, 'exact'), 3661);
});

test('rounding: 6-minute increments snap to the nearest 0.1 h', () => {
  assert.equal(applyRounding(200, 'nearest-6-min'), 360); // 3m20s -> 6m (rounds up)
  assert.equal(applyRounding(400, 'nearest-6-min'), 360); // 6m40s -> 6m (rounds down)
  assert.equal(toDecimalHours(applyRounding(3600 + 200, 'nearest-6-min')), 1.1);
});

test('rounding: never bills a tracked session as zero', () => {
  assert.equal(applyRounding(30, 'nearest-15-min'), 15 * 60);
});

test('rounding: up-15 always rounds up', () => {
  assert.equal(applyRounding(16 * 60, 'up-15-min'), 30 * 60);
});

test('earnings: non-billable work is always zero', () => {
  assert.equal(calculateEarnings(3600, 120, false), 0);
  assert.equal(calculateEarnings(1800, 120, true), 60);
});

test('reducer: start banks nothing and marks the entry active', () => {
  const state = timeTrackerReducer(createEmptyState(), {
    type: 'timer/start',
    at: '2026-09-01T10:00:00.000Z',
    input: {
      clientId: 'c1',
      projectId: null,
      description: 'work',
      isBillable: true,
      rateApplied: 100,
      rateQuoted: { amount: 100, period: 'hourly' },
      currency: 'USD',
    },
  });
  assert.equal(state.entries.length, 1);
  assert.equal(state.timer.isRunning, true);
  assert.equal(state.entries[0]!.durationSeconds, 0);
});

test('reducer: pause banks elapsed seconds, resume + stop accumulate correctly', () => {
  let state = timeTrackerReducer(createEmptyState(), {
    type: 'timer/start',
    at: '2026-09-01T10:00:00.000Z',
    input: {
      clientId: 'c1',
      projectId: null,
      description: 'work',
      isBillable: true,
      rateApplied: 100,
      rateQuoted: { amount: 100, period: 'hourly' },
      currency: 'USD',
    },
  });
  state = timeTrackerReducer(state, { type: 'timer/pause', at: '2026-09-01T10:30:00.000Z' });
  assert.equal(state.entries[0]!.durationSeconds, 1800);
  assert.equal(state.timer.isRunning, false);

  // Paused time must NOT be billed.
  state = timeTrackerReducer(state, { type: 'timer/resume', at: '2026-09-01T11:00:00.000Z' });
  state = timeTrackerReducer(state, { type: 'timer/stop', at: '2026-09-01T11:15:00.000Z' });
  assert.equal(state.entries[0]!.durationSeconds, 1800 + 900);
  assert.equal(state.entries[0]!.endTime, '2026-09-01T11:15:00.000Z');
  assert.equal(state.timer.activeEntryId, null);
});

test('reducer: starting a second timer closes the first', () => {
  const base = timeTrackerReducer(createEmptyState(), {
    type: 'timer/start',
    at: '2026-09-01T10:00:00.000Z',
    input: {
      clientId: 'c1',
      projectId: null,
      description: 'first',
      isBillable: true,
      rateApplied: 100,
      rateQuoted: { amount: 100, period: 'hourly' },
      currency: 'USD',
    },
  });
  const next = timeTrackerReducer(base, {
    type: 'timer/start',
    at: '2026-09-01T10:20:00.000Z',
    input: {
      clientId: 'c2',
      projectId: null,
      description: 'second',
      isBillable: true,
      rateApplied: 100,
      rateQuoted: { amount: 100, period: 'hourly' },
      currency: 'USD',
    },
  });
  const first = next.entries.find((entry) => entry.description === 'first')!;
  assert.equal(first.endTime, '2026-09-01T10:20:00.000Z');
  assert.equal(first.durationSeconds, 1200);
  assert.equal(next.entries.filter((entry) => entry.endTime === null).length, 1);
});

test('reducer: editing an entry boundary re-derives its duration', () => {
  let state = createEmptyState();
  state = timeTrackerReducer(state, {
    type: 'entry/addManual',
    input: {
      clientId: 'c1',
      projectId: null,
      description: 'manual',
      isBillable: true,
      rateApplied: 100,
      rateQuoted: { amount: 100, period: 'hourly' },
      currency: 'USD',
      startTime: '2026-09-01T09:00:00.000Z',
      endTime: '2026-09-01T10:00:00.000Z',
    },
  });
  assert.equal(state.entries[0]!.durationSeconds, 3600);

  state = timeTrackerReducer(state, {
    type: 'entry/update',
    id: state.entries[0]!.id,
    patch: { endTime: '2026-09-01T11:30:00.000Z' },
  });
  assert.equal(state.entries[0]!.durationSeconds, 9000);
});

/* ------------------------- quoted rates -> hourly ------------------------- */

const EIGHT = LEGACY_WORK_SCHEDULE;                                   // 8h day
const TWELVE = { hoursPerDay: 12, daysPerWeek: 5, weeksPerYear: 52 };  // 12h day

test('rates: every period converts to the same hourly figure (8h day)', () => {
  assert.equal(toHourlyRate({ amount: 95, period: 'hourly' }, EIGHT), 95);
  assert.equal(toHourlyRate({ amount: 760, period: 'daily' }, EIGHT), 95); // 760 / 8
  assert.equal(toHourlyRate({ amount: 3800, period: 'weekly' }, EIGHT), 95); // 3800 / 40
  assert.equal(toHourlyRate({ amount: 197_600, period: 'yearly' }, EIGHT), 95); // / 2080
});

test('rates: a 12-hour day prices the same daily rate differently', () => {
  // The whole point of the setting: $1,200/day is $150/h at 8h and $100/h at 12h.
  assert.equal(toHourlyRate({ amount: 1200, period: 'daily' }, EIGHT), 150);
  assert.equal(toHourlyRate({ amount: 1200, period: 'daily' }, TWELVE), 100);
});

test('rates: the whole ladder derives from hoursPerDay', () => {
  const hours = billableHours(TWELVE);
  assert.equal(hours.daily, 12);
  assert.equal(hours.weekly, 60); // 12 × 5
  assert.equal(hours.yearly, 3120); // 60 × 52
  assert.equal(hours.monthly, 3120 / 12); // a month is a twelfth of the year…
  assert.notEqual(hours.monthly, hours.weekly * 4); // …not four weeks
});

test('rates: a month is a twelfth of the year, not four weeks', () => {
  const hours = billableHours(EIGHT);
  assert.equal(hours.monthly, 2080 / 12);
  // $10k/month on an 8h day is ~$57.69/h, not the $62.50/h a 160h month implies.
  assert.equal(
    Math.round(toHourlyRate({ amount: 10_000, period: 'monthly' }, EIGHT) * 100) / 100,
    57.69,
  );
});

test('rates: converting between periods preserves the hourly value', () => {
  const daily = convertAmount(150, 'hourly', 'daily', TWELVE);
  assert.equal(daily, 1800); // 150 × 12
  assert.equal(toHourlyRate({ amount: daily, period: 'daily' }, TWELVE), 150);
});

test('rates: a nonsense schedule falls back instead of dividing by zero', () => {
  assert.deepEqual(normalizeSchedule(undefined), DEFAULT_WORK_SCHEDULE);
  assert.equal(normalizeSchedule({ hoursPerDay: 0 }).hoursPerDay, DEFAULT_WORK_SCHEDULE.hoursPerDay);
  assert.equal(normalizeSchedule({ hoursPerDay: 99 }).hoursPerDay, 24); // clamped
  assert.equal(Number.isFinite(toHourlyRate({ amount: 100, period: 'daily' }, { hoursPerDay: 0, daysPerWeek: 0, weeksPerYear: 0 })), true);
});

test('rates: format shows how the rate was quoted, not the hourly maths', () => {
  assert.equal(formatRate({ amount: 800, period: 'daily' }, 'USD'), '$800/day');
  assert.equal(formatRate({ amount: 95, period: 'hourly' }, 'USD'), '$95/h');
});

/* ------------------------------ migrations ------------------------------- */

test('migration: v1 hourly numbers become v2 quoted rates', () => {
  const v1 = {
    version: 1,
    clients: [{ id: 'c1', name: 'Old Co', defaultHourlyRate: 95, currency: 'USD' }],
    projects: [
      { id: 'p1', clientId: 'c1', name: 'Legacy', hourlyRate: 120 },
      { id: 'p2', clientId: 'c1', name: 'Inherits', hourlyRate: null },
    ],
    entries: [{ id: 'e1', clientId: 'c1', rateApplied: 95, durationSeconds: 3600 }],
    timer: { activeEntryId: null, isRunning: false, startedAt: null },
    settings: {},
  };

  const migrated = migrate(v1) as unknown as {
    version: number;
    clients: { defaultRate: { amount: number; period: string } }[];
    projects: { rate: { amount: number; period: string } | null }[];
    entries: { rateApplied: number; rateQuoted: { amount: number } }[];
  };

  assert.equal(migrated.version, 4);
  assert.deepEqual(migrated.clients[0]!.defaultRate, { amount: 95, period: 'hourly' });
  assert.deepEqual(migrated.projects[0]!.rate, { amount: 120, period: 'hourly' });
  assert.equal(migrated.projects[1]!.rate, null); // null must stay null: "inherit"
  // Invoiced history must never be re-priced by a migration.
  assert.equal(migrated.entries[0]!.rateApplied, 95);
  assert.equal(migrated.entries[0]!.rateQuoted.amount, 95);
});

test('migration: v2 stores keep the 8-hour day they were priced under', () => {
  // The critical case: an existing user must NOT silently inherit the new
  // 12-hour default, which would re-price every daily and weekly rate they have.
  const v2 = {
    version: 2,
    clients: [{ id: 'c1', name: 'Old Co', defaultRate: { amount: 1200, period: 'daily' }, currency: 'USD' }],
    projects: [],
    entries: [],
    timer: { activeEntryId: null, isRunning: false, startedAt: null },
    settings: { roundingRule: 'exact' },
  };

  const migrated = migrate(v2);
  assert.deepEqual(migrated.settings.workSchedule, LEGACY_WORK_SCHEDULE);
  assert.equal(
    toHourlyRate(migrated.clients[0]!.defaultRate, migrated.settings.workSchedule),
    150, // still $150/h, exactly as before the upgrade
  );
});

test('migration: a fresh store gets the current default schedule', () => {
  assert.deepEqual(migrate({ version: 3 }).settings.workSchedule, DEFAULT_WORK_SCHEDULE);
});

test('migration: unversioned junk falls back to an empty store, never a crash', () => {
  assert.equal(migrate(null).clients.length, 0);
  assert.equal(migrate('nonsense').entries.length, 0);
  assert.equal(migrate({ version: 4 }).version, 4);
});

/* --------------------- price override (edit dialog math) ------------------ */

test('price: the default price is the duration at the effective rate', () => {
  assert.equal(priceForDuration(3600, 95), 95);
  assert.equal(priceForDuration(5400, 95), 142.5); // 1.5 h
  assert.equal(priceForDuration(0, 95), 0);
});

test('price: an overridden total implies an hourly rate, and round-trips', () => {
  const seconds = 2.5 * 3600;
  const hourly = hourlyFromPrice(500, seconds);
  assert.equal(hourly, 200);
  assert.equal(priceForDuration(seconds, hourly), 500);
});

test('price: a zero-length block implies no rate rather than Infinity', () => {
  assert.equal(hourlyFromPrice(500, 0), 0);
  assert.equal(Number.isFinite(hourlyFromPrice(500, 0)), true);
});

/* -------------------------------- sorting -------------------------------- */

const row = (id: string, startTime: string, liveSeconds: number, earnings: number) =>
  ({ id, startTime, liveSeconds, earnings }) as unknown as EnrichedEntry;

const SAMPLE = [
  row('a', '2026-09-01T09:00:00.000Z', 3600, 95),
  row('b', '2026-08-30T09:00:00.000Z', 7200, 40),
  row('c', '2026-08-31T09:00:00.000Z', 1800, 300),
];

const ids = (list: EnrichedEntry[]) => list.map((entry) => entry.id).join('');

test('sort: each order arranges the same list differently', () => {
  assert.equal(ids(sortEntries(SAMPLE, 'newest')), 'acb');
  assert.equal(ids(sortEntries(SAMPLE, 'oldest')), 'bca');
  assert.equal(ids(sortEntries(SAMPLE, 'longest')), 'bac');
  assert.equal(ids(sortEntries(SAMPLE, 'shortest')), 'cab');
  assert.equal(ids(sortEntries(SAMPLE, 'highest')), 'cab');
});

test('sort: never mutates the array it was given', () => {
  const before = ids(SAMPLE);
  sortEntries(SAMPLE, 'oldest');
  assert.equal(ids(SAMPLE), before);
});

/* -------------------------------- overtime -------------------------------- */

test('overtime: hours x rate x multiplier, and nothing more', () => {
  assert.equal(overtimeAmount({ hours: 2, multiplier: 1.5 }, 95), 285); // 2 × 95 × 1.5
  assert.equal(overtimeAmount({ hours: 2, multiplier: 2 }, 95), 380);
  assert.equal(overtimeAmount({ hours: 0.5, multiplier: 1.5 }, 120), 90);
});

test('overtime: absent, zero or nonsense means no surcharge', () => {
  assert.equal(overtimeAmount(null, 95), 0);
  assert.equal(overtimeAmount(undefined, 95), 0);
  assert.equal(overtimeAmount({ hours: 0, multiplier: 1.5 }, 95), 0);
  assert.equal(overtimeAmount({ hours: 2, multiplier: 0 }, 95), 0);
  assert.equal(overtimeAmount({ hours: NaN, multiplier: 1.5 }, 95), 0);
});

test('overtime: normalize rejects junk and caps runaway multipliers', () => {
  assert.equal(normalizeOvertime({ hours: -3, multiplier: 1.5 }), null);
  assert.deepEqual(normalizeOvertime({ hours: 2, multiplier: 99 }), {
    hours: 2,
    multiplier: 10,
    source: 'manual',
  });
  // No source recorded means 'manual' — that is what the field meant before
  // policies existed, so old entries keep billing the way they always did.
  assert.deepEqual(normalizeOvertime({ hours: 1.25, multiplier: 1.5 }), {
    hours: 1.25,
    multiplier: 1.5,
    source: 'manual',
  });
});

test('overtime: an entry priced with an override carries that rate into overtime', () => {
  // $500 for a 2.5 h block is $200/h, so 1 h of time-and-a-half is $300 — not
  // $142.50 from the client's standing rate. The surcharge follows the entry.
  const hourly = hourlyFromPrice(500, 2.5 * 3600);
  assert.equal(overtimeAmount({ hours: 1, multiplier: 1.5 }, hourly), 300);
});

/* --------------------- automatic overtime (the policy) -------------------- */

const POLICY = { enabled: true, thresholdHours: 12, multiplier: 1.5 };

test('policy: only the hours past the threshold become overtime', () => {
  assert.equal(autoOvertimeFor(10 * 3600, POLICY), null);
  assert.equal(autoOvertimeFor(12 * 3600, POLICY), null);
  assert.deepEqual(autoOvertimeFor(14 * 3600, POLICY), {
    hours: 2,
    multiplier: 1.5,
    source: 'auto',
  });
});

test('policy: a minute either side of the threshold is not overtime', () => {
  assert.equal(autoOvertimeFor(12 * 3600 + 30, POLICY), null); // 30s over
  assert.notEqual(autoOvertimeFor(12 * 3600 + 300, POLICY), null); // 5m over
});

test('policy: disabled means nothing is ever applied automatically', () => {
  assert.equal(autoOvertimeFor(20 * 3600, { ...POLICY, enabled: false }), null);
});

test('policy: junk thresholds fall back rather than charging everything', () => {
  assert.equal(normalizePolicy({ thresholdHours: 0 }).thresholdHours, 12);
  assert.equal(normalizePolicy({ multiplier: 0.1 }).multiplier, 1);
  assert.equal(normalizePolicy({ multiplier: 50 }).multiplier, 10);
});

/* ---- the double-billing trap: auto carves out, manual adds on top -------- */

test('split: automatic overtime re-prices tracked hours without adding any', () => {
  const tracked = 14 * 3600;
  const split = splitOvertime(autoOvertimeFor(tracked, POLICY), tracked);
  assert.equal(split.regularSeconds, 12 * 3600); // 12 h at the normal rate
  assert.equal(split.overtimeSeconds, 2 * 3600); // 2 h at 1.5×
  assert.equal(split.totalSeconds, tracked); // still 14 h billed, not 16
});

test('split: manual overtime adds hours that were never tracked', () => {
  const tracked = 8 * 3600;
  const split = splitOvertime({ hours: 2, multiplier: 1.5, source: 'manual' }, tracked);
  assert.equal(split.regularSeconds, tracked); // all 8 h at the normal rate
  assert.equal(split.overtimeSeconds, 2 * 3600);
  assert.equal(split.totalSeconds, 10 * 3600); // 8 tracked + 2 extra
});

test('split: a 14 h day at $95/h bills $1,425, not $1,615', () => {
  const tracked = 14 * 3600;
  const overtime = autoOvertimeFor(tracked, POLICY)!;
  const split = splitOvertime(overtime, tracked);
  const total =
    priceForDuration(split.regularSeconds, 95) + overtimeAmount(overtime, 95);
  assert.equal(total, 12 * 95 + 2 * 95 * 1.5); // 1140 + 285
  assert.equal(total, 1425);
  // The bug this guards: pricing all 14 h AND adding the overtime on top.
  assert.notEqual(total, 14 * 95 + 2 * 95 * 1.5);
});

test('migration: existing stores get overtime switched OFF, not applied retroactively', () => {
  const v3 = {
    version: 3,
    clients: [],
    projects: [],
    entries: [],
    timer: { activeEntryId: null, isRunning: false, startedAt: null },
    settings: { roundingRule: 'exact' },
  };
  assert.equal(migrate(v3).settings.overtimePolicy.enabled, false);
  // A fresh install, by contrast, starts with it on.
  assert.equal(createEmptyState().settings.overtimePolicy.enabled, true);
});

/* ---------------------------- job title history --------------------------- */

const titled = (id: string, description: string) =>
  ({ id, description, startTime: '2026-09-01T09:00:00.000Z' }) as unknown as EnrichedEntry;

test('titles: most recent first, no duplicates, blanks skipped', () => {
  // enrichAll hands us newest-first, so first sighting = most recent use.
  const list = recentJobTitles([
    titled('1', 'Site build'),
    titled('2', ''),
    titled('3', 'Client call'),
    titled('4', 'Site build'),
    titled('5', '   '),
  ]);
  assert.deepEqual(list, ['Site build', 'Client call']);
});

test('titles: matching is case-insensitive, and the newest casing wins', () => {
  const list = recentJobTitles([titled('1', 'Site Build'), titled('2', 'site build')]);
  assert.deepEqual(list, ['Site Build']);
});

test('titles: the limit caps the picker', () => {
  const many = Array.from({ length: 30 }, (_, i) => titled(String(i), `Job ${i}`));
  assert.equal(recentJobTitles(many).length, 12);
  assert.equal(recentJobTitles(many, 3).length, 3);
});

/* ------------------------------- invoices -------------------------------- */

const billed = (id: string, clientId: string, projectId: string | null = null, currency = 'USD') =>
  ({ id, clientId, clientName: clientId, projectId, projectName: projectId, currency }) as unknown as EnrichedEntry;

test('invoices: no entries means no invoices', () => {
  assert.deepEqual(groupIntoInvoices([]), []);
});

test('invoices: one client and project becomes one invoice holding every entry', () => {
  const drafts = groupIntoInvoices([billed('a', 'acme'), billed('b', 'acme')]);
  assert.equal(drafts.length, 1);
  assert.equal(ids(drafts[0]!.entries), 'ab');
});

test('invoices: clients keep the order they were first registered in', () => {
  const drafts = groupIntoInvoices([
    billed('a', 'acme'),
    billed('b', 'globex'),
    billed('c', 'acme'),
  ]);
  assert.deepEqual(drafts.map((d) => d.clientName), ['acme', 'globex']);
  assert.equal(ids(drafts[0]!.entries), 'ac');
  assert.equal(ids(drafts[1]!.entries), 'b');
});

test('invoices: one client in two currencies splits into two invoices', () => {
  const drafts = groupIntoInvoices([
    billed('a', 'acme', null, 'USD'),
    billed('b', 'acme', null, 'EUR'),
  ]);
  assert.deepEqual(drafts.map((d) => d.currency), ['USD', 'EUR']);
});

test('invoices: one client with two projects becomes two invoices', () => {
  const drafts = groupIntoInvoices([billed('a', 'acme', 'web'), billed('b', 'acme', 'brand')]);
  assert.deepEqual(drafts.map((d) => d.projectName), ['web', 'brand']);
});

test('invoices: never mutates the array it was given', () => {
  const input = [billed('a', 'acme'), billed('b', 'globex')];
  groupIntoInvoices(input);
  assert.equal(ids(input), 'ab');
});

test('invoices: the label names the project only when there is one', () => {
  const [withProject, withoutProject] = groupIntoInvoices([
    billed('a', 'Acme', 'Website'),
    billed('b', 'Globex'),
  ]);
  assert.equal(invoiceLabel(withProject!), 'Acme · Website');
  assert.equal(invoiceLabel(withoutProject!), 'Globex');
});

test('invoices: file names are safe on every OS', () => {
  assert.equal(invoiceFileName('Acme · Website', '2026-09-25'), 'invoice-acme-website-2026-09-25.pdf');
  assert.equal(invoiceFileName('Café Müller, Inc.', '2026-09-25'), 'invoice-cafe-muller-inc-2026-09-25.pdf');
  assert.equal(invoiceFileName(null, '2026-09-25'), 'invoice-2026-09-25.pdf');
  assert.equal(invoiceFileName('···', '2026-09-25'), 'invoice-2026-09-25.pdf');
});