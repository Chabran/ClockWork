import type { PersistedState, Rate } from '@/lib/types';
import { createEmptyState } from '@/lib/defaults';
import { LEGACY_WORK_SCHEDULE } from '@/lib/time/rates';

export const CURRENT_SCHEMA_VERSION = 4;

/**
 * Upgrades any previously persisted blob to the current schema.
 *
 * Why this exists: localStorage data outlives your code. Version 1 stored bare
 * hourly numbers (`defaultHourlyRate: 95`); version 2 stores quoted rates
 * (`defaultRate: { amount: 95, period: 'hourly' }`). Every user who opened the
 * app before this change still has v1 in their browser right now — without the
 * step below they would open it to a blank client list and think their data
 * was deleted.
 *
 * Migrations are written as a chain of small, one-way steps. Each one knows
 * only how to go from N to N+1, so adding v5 later means appending a function,
 * not editing this one.
 */
export function migrate(raw: unknown): PersistedState {
  const empty = createEmptyState();
  if (typeof raw !== 'object' || raw === null) return empty;

  let state = raw as Record<string, unknown>;
  const version = typeof state.version === 'number' ? state.version : 0;

  if (version < 2) state = v1ToV2(state);
  if (version < 3) state = v2ToV3(state);
  if (version < 4) state = v3ToV4(state);

  const candidate = state as Partial<PersistedState>;
  return {
    version: CURRENT_SCHEMA_VERSION,
    clients: candidate.clients ?? empty.clients,
    projects: candidate.projects ?? empty.projects,
    entries: candidate.entries ?? empty.entries,
    timer: candidate.timer ?? empty.timer,
    settings: { ...empty.settings, ...candidate.settings },
  };
}

/**
 * v3 → v4: overtime starts applying automatically.
 *
 * New installs get the policy switched ON (anything past 12 h on one entry
 * bills at 1.5×). Handing that to an existing user would silently add a
 * surcharge to every long session they have ever logged — invoices they may
 * already have sent.
 *
 * So old stores get the policy switched OFF, with the same defaults sitting
 * there ready. Nothing they have re-prices; turning it on is their decision,
 * made once, in the open. (Same rule as v2→v3: preserve meaning, do not apply
 * today's defaults.)
 */
function v3ToV4(state: Record<string, unknown>): Record<string, unknown> {
  const settings = (state.settings ?? {}) as Record<string, unknown>;
  return {
    ...state,
    settings: {
      ...settings,
      overtimePolicy: settings.overtimePolicy ?? {
        enabled: false,
        thresholdHours: 12,
        multiplier: 1.5,
      },
    },
    version: 4,
  };
}

/**
 * v2 → v3: the working day becomes a setting.
 *
 * Versions 1 and 2 hard-coded an 8-hour day, so every non-hourly rate in
 * existing data was priced against it. New installs default to a 12-hour day,
 * but handing that to an existing user would silently re-price every daily,
 * weekly and monthly rate they have — a $1,200/day rate would drop from $150/h
 * to $100/h without anyone touching it.
 *
 * So this step pins old stores to the schedule they were actually priced under.
 * A migration's job is to preserve meaning, not to apply today's defaults.
 */
function v2ToV3(state: Record<string, unknown>): Record<string, unknown> {
  const settings = (state.settings ?? {}) as Record<string, unknown>;
  return {
    ...state,
    settings: { ...settings, workSchedule: settings.workSchedule ?? { ...LEGACY_WORK_SCHEDULE } },
    version: 3,
  };
}

/** v1: flat hourly numbers → v2: `{ amount, period }` rate objects. */
function v1ToV2(state: Record<string, unknown>): Record<string, unknown> {
  const hourly = (amount: unknown): Rate => ({
    amount: typeof amount === 'number' ? amount : 0,
    period: 'hourly',
  });

  const clients = Array.isArray(state.clients)
    ? state.clients.map((raw) => {
        const client = raw as Record<string, unknown>;
        return {
          ...client,
          defaultRate: client.defaultRate ?? hourly(client.defaultHourlyRate),
          defaultHourlyRate: undefined,
        };
      })
    : state.clients;

  const projects = Array.isArray(state.projects)
    ? state.projects.map((raw) => {
        const project = raw as Record<string, unknown>;
        return {
          ...project,
          rate: project.rate ?? (project.hourlyRate == null ? null : hourly(project.hourlyRate)),
          hourlyRate: undefined,
        };
      })
    : state.projects;

  // Entries already store `rateApplied` as an hourly number — that stays exactly
  // as it was, because re-pricing invoiced history is the one thing a migration
  // must never do. We only add the quoted form for display.
  const entries = Array.isArray(state.entries)
    ? state.entries.map((raw) => {
        const entry = raw as Record<string, unknown>;
        return { ...entry, rateQuoted: entry.rateQuoted ?? hourly(entry.rateApplied) };
      })
    : state.entries;

  return { ...state, clients, projects, entries, version: 2 };
}
