import type {
  Client,
  PersistedState,
  OvertimeFee,
  Project,
  Rate,
  Settings,
  TimeEntry,
} from '@/lib/types';
import { createId } from '@/lib/defaults';

/**
 * All state transitions in one pure function.
 *
 * Why a reducer instead of a dozen `useState` calls: starting a timer touches
 * `entries` AND `timer` together. Split state lets those two drift apart for a
 * render (or forever, after a bug). A reducer makes "add an entry and mark it
 * active" a single atomic, testable transition.
 */

export interface StartTimerInput {
  clientId: string;
  projectId: string | null;
  description: string;
  isBillable: boolean;
  /** Hourly equivalent, frozen onto the entry. */
  rateApplied: number;
  /** How that rate was quoted, for the invoice line. */
  rateQuoted: Rate;
  /** Optional overtime surcharge, set from the entry editor. */
  overtime?: OvertimeFee | null;
  currency: string;
}

export interface ManualEntryInput extends StartTimerInput {
  startTime: string;
  endTime: string;
}

export type TrackerAction =
  | { type: 'hydrate'; state: PersistedState }
  | { type: 'timer/start'; input: StartTimerInput; at: string }
  | { type: 'timer/pause'; at: string }
  | { type: 'timer/resume'; at: string }
  | { type: 'timer/stop'; at: string }
  | { type: 'timer/discard' }
  | { type: 'entry/addManual'; input: ManualEntryInput }
  | { type: 'entry/update'; id: string; patch: Partial<TimeEntry> }
  | { type: 'entry/delete'; id: string }
  | { type: 'client/add'; client: Client }
  | { type: 'client/update'; id: string; patch: Partial<Client> }
  | { type: 'client/delete'; id: string }
  | { type: 'project/add'; project: Project }
  | { type: 'project/update'; id: string; patch: Partial<Project> }
  | { type: 'project/delete'; id: string }
  | { type: 'settings/update'; patch: Partial<Settings> };

/** Seconds elapsed in the currently running segment, or 0 if not running. */
function segmentSeconds(startedAt: string | null, at: string): number {
  if (!startedAt) return 0;
  return Math.max(0, Math.round((new Date(at).getTime() - new Date(startedAt).getTime()) / 1000));
}

/** Folds the in-flight segment into an entry's committed durationSeconds. */
function bankSegment(state: PersistedState, at: string): TimeEntry[] {
  const { activeEntryId, isRunning, startedAt } = state.timer;
  if (!activeEntryId || !isRunning) return state.entries;
  const banked = segmentSeconds(startedAt, at);
  return state.entries.map((entry) =>
    entry.id === activeEntryId
      ? { ...entry, durationSeconds: entry.durationSeconds + banked, updatedAt: at }
      : entry,
  );
}

export function timeTrackerReducer(state: PersistedState, action: TrackerAction): PersistedState {
  switch (action.type) {
    case 'hydrate':
      return action.state;

    case 'timer/start': {
      // Starting a new timer always closes the previous one — one clock, always.
      const closed = closeActive(state, action.at);
      const entry: TimeEntry = {
        id: createId(),
        clientId: action.input.clientId,
        projectId: action.input.projectId,
        description: action.input.description,
        startTime: action.at,
        endTime: null,
        durationSeconds: 0,
        isBillable: action.input.isBillable,
        rateApplied: action.input.rateApplied,
        rateQuoted: action.input.rateQuoted,
        overtime: action.input.overtime ?? null,
        currency: action.input.currency,
        createdAt: action.at,
        updatedAt: action.at,
      };
      return {
        ...closed,
        entries: [entry, ...closed.entries],
        timer: { activeEntryId: entry.id, isRunning: true, startedAt: action.at },
      };
    }

    case 'timer/pause': {
      if (!state.timer.isRunning) return state;
      return {
        ...state,
        entries: bankSegment(state, action.at),
        timer: { ...state.timer, isRunning: false, startedAt: null },
      };
    }

    case 'timer/resume': {
      if (!state.timer.activeEntryId || state.timer.isRunning) return state;
      return { ...state, timer: { ...state.timer, isRunning: true, startedAt: action.at } };
    }

    case 'timer/stop':
      return closeActive(state, action.at);

    case 'timer/discard': {
      const activeId = state.timer.activeEntryId;
      if (!activeId) return state;
      return {
        ...state,
        entries: state.entries.filter((entry) => entry.id !== activeId),
        timer: { activeEntryId: null, isRunning: false, startedAt: null },
      };
    }

    case 'entry/addManual': {
      const durationSeconds = Math.max(
        0,
        Math.round(
          (new Date(action.input.endTime).getTime() - new Date(action.input.startTime).getTime()) /
            1000,
        ),
      );
      const now = new Date().toISOString();
      const entry: TimeEntry = {
        id: createId(),
        clientId: action.input.clientId,
        projectId: action.input.projectId,
        description: action.input.description,
        startTime: action.input.startTime,
        endTime: action.input.endTime,
        durationSeconds,
        isBillable: action.input.isBillable,
        rateApplied: action.input.rateApplied,
        rateQuoted: action.input.rateQuoted,
        overtime: action.input.overtime ?? null,
        currency: action.input.currency,
        createdAt: now,
        updatedAt: now,
      };
      return { ...state, entries: [entry, ...state.entries] };
    }

    case 'entry/update': {
      const now = new Date().toISOString();
      return {
        ...state,
        entries: state.entries.map((entry) => {
          if (entry.id !== action.id) return entry;
          const merged = { ...entry, ...action.patch, id: entry.id, updatedAt: now };
          // Editing either boundary re-derives duration; they must never disagree.
          if (merged.endTime && (action.patch.startTime || action.patch.endTime)) {
            merged.durationSeconds = Math.max(
              0,
              Math.round(
                (new Date(merged.endTime).getTime() - new Date(merged.startTime).getTime()) / 1000,
              ),
            );
          }
          return merged;
        }),
      };
    }

    case 'entry/delete':
      return {
        ...state,
        entries: state.entries.filter((entry) => entry.id !== action.id),
        timer:
          state.timer.activeEntryId === action.id
            ? { activeEntryId: null, isRunning: false, startedAt: null }
            : state.timer,
      };

    case 'client/add':
      return { ...state, clients: [...state.clients, action.client] };

    case 'client/update':
      return {
        ...state,
        clients: state.clients.map((client) =>
          client.id === action.id ? { ...client, ...action.patch, id: client.id } : client,
        ),
      };

    case 'client/delete':
      // Cascade: a client's projects and history go with it.
      return {
        ...state,
        clients: state.clients.filter((client) => client.id !== action.id),
        projects: state.projects.filter((project) => project.clientId !== action.id),
        entries: state.entries.filter((entry) => entry.clientId !== action.id),
      };

    case 'project/add':
      return { ...state, projects: [...state.projects, action.project] };

    case 'project/update':
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.id ? { ...project, ...action.patch, id: project.id } : project,
        ),
      };

    case 'project/delete':
      return {
        ...state,
        projects: state.projects.filter((project) => project.id !== action.id),
        entries: state.entries.map((entry) =>
          entry.projectId === action.id ? { ...entry, projectId: null } : entry,
        ),
      };

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    default:
      return state;
  }
}

/** Banks any running segment, stamps endTime, and clears the timer. */
function closeActive(state: PersistedState, at: string): PersistedState {
  const activeId = state.timer.activeEntryId;
  if (!activeId) return state;
  const banked = bankSegment(state, at);
  return {
    ...state,
    entries: banked.map((entry) =>
      entry.id === activeId ? { ...entry, endTime: at, updatedAt: at } : entry,
    ),
    timer: { activeEntryId: null, isRunning: false, startedAt: null },
  };
}
