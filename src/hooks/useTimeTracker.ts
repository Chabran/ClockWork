'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type {
  Client,
  EnrichedEntry,
  PersistedState,
  Project,
  OvertimePolicy,
  Rate,
  Settings,
  WorkSchedule,
  TimeEntry,
  TimesheetFilters,
} from '@/lib/types';
import { CLIENT_COLORS, createEmptyState, createId, createSeedState, DEFAULT_FILTERS } from '@/lib/defaults';
import { createStorageAdapter } from '@/lib/storage';
import {
  clientBreakdown,
  enrichAll,
  filterEntries,
  periodTotals,
  recentJobTitles,
  sortEntries,
  sumEntries,
  type ClientBreakdownRow,
  type DashboardTotals,
  type PeriodTotals,
} from '@/lib/selectors';
import { makeRate, normalizePolicy, normalizeSchedule, toHourlyRate } from '@/lib/time/rates';
import { useNow } from './useNow';
import {
  timeTrackerReducer,
  type ManualEntryInput,
  type StartTimerInput,
} from './timeTrackerReducer';

export interface UseTimeTracker {
  /** False until localStorage has been read — render skeletons, not zeros. */
  isHydrated: boolean;
  clients: Client[];
  projects: Project[];
  settings: Settings;
  filters: TimesheetFilters;
  setFilters: (patch: Partial<TimesheetFilters>) => void;
  resetFilters: () => void;

  /** The running/paused entry, already enriched with live seconds and earnings. */
  activeEntry: EnrichedEntry | null;
  isRunning: boolean;
  /** Live elapsed seconds of the active entry, drift-free. */
  elapsedSeconds: number;
  /** Live accrued money for the active entry. */
  accruedEarnings: number;

  entries: EnrichedEntry[];
  /** Job titles used before, most recent first — the picker's options. */
  jobTitles: string[];
  filteredEntries: EnrichedEntry[];
  filteredTotals: PeriodTotals;
  totals: DashboardTotals;
  breakdown: ClientBreakdownRow[];

  startTimer: (input: Partial<StartTimerInput> & { clientId: string }) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  discardTimer: () => void;

  addManualEntry: (input: ManualEntryInput) => void;
  updateEntry: (id: string, patch: Partial<TimeEntry>) => void;
  deleteEntry: (id: string) => void;

  addClient: (input: { name: string; defaultRate?: Rate; currency?: string }) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addProject: (input: { clientId: string; name: string; rate?: Rate | null }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  /** Effective HOURLY rate for a client/project pair — project overrides client. */
  resolveRate: (clientId: string, projectId: string | null) => number;
  /** The same rate as quoted, plus which record it came from. */
  resolveRateSpec: (
    clientId: string | null,
    projectId: string | null,
  ) => { rate: Rate; source: 'project' | 'client' };
  /** Writes a quoted rate to the project when given, otherwise the client. */
  setRate: (target: { clientId: string; projectId: string | null }, rate: Rate) => void;
  /** The user's working day/week/year, always normalized. */
  workSchedule: WorkSchedule;
  setWorkSchedule: (patch: Partial<WorkSchedule>) => void;
  /** Overtime terms in force for a client (their override, else the global). */
  overtimePolicyFor: (clientId: string | null) => { policy: OvertimePolicy; isClientOverride: boolean };
  /** Writes the terms globally, or onto one client. */
  setOvertimePolicy: (
    patch: Partial<OvertimePolicy>,
    target?: { clientId: string | null },
  ) => void;
  /** Puts a client back on the global terms. */
  clearClientOvertimePolicy: (clientId: string) => void;
  projectsForClient: (clientId: string) => Project[];
  resetAll: () => void;
}

/**
 * The single source of truth for time tracking.
 *
 * Responsibilities, in order:
 *  1. Hydrate persisted state from the StorageAdapter (once, client-side).
 *  2. Apply reducer transitions.
 *  3. Persist every change back, debounced.
 *  4. Keep other tabs in sync.
 *  5. Expose derived, ready-to-render data.
 *
 * Components below this hook hold no business logic — they render props and
 * call handlers. That is what makes the UI trivially replaceable.
 */
export function useTimeTracker(): UseTimeTracker {
  const adapter = useMemo(() => createStorageAdapter(), []);
  const [state, dispatch] = useReducer(timeTrackerReducer, undefined, createEmptyState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [filters, setFiltersState] = useState<TimesheetFilters>(DEFAULT_FILTERS);

  // --- 1. Hydration -------------------------------------------------------
  // Next.js renders on the server where `localStorage` does not exist. Reading
  // it inside an effect (never during render) keeps server and first client
  // render identical, which is what avoids hydration mismatch warnings.
  useEffect(() => {
    let cancelled = false;
    void adapter.load().then((loaded) => {
      if (cancelled) return;
      dispatch({ type: 'hydrate', state: loaded ?? createSeedState() });
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [adapter]);

  // --- 3. Persistence -----------------------------------------------------
  // Debounced so a burst of edits writes once. `isHydrated` guards against the
  // classic bug: saving the empty initial state over real data on mount.
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isHydrated) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => void adapter.save(state), 150);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [state, isHydrated, adapter]);

  // Flush synchronously on unload so nothing in the debounce window is lost.
  useEffect(() => {
    const flush = () => void adapter.save(state);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [state, adapter]);

  // --- 4. Cross-tab sync --------------------------------------------------
  useEffect(() => {
    return adapter.subscribe((external: PersistedState) => {
      dispatch({ type: 'hydrate', state: external });
    });
  }, [adapter]);

  // --- 2/5. Derived data --------------------------------------------------
  const isRunning = state.timer.isRunning;
  const now = useNow(isRunning); // only ticks while a timer runs
  const nowMs = isRunning ? now : Date.now();

  const entries = useMemo(() => enrichAll(state, nowMs), [state, nowMs]);
  const filteredEntries = useMemo(
    () => sortEntries(filterEntries(entries, filters), filters.sort),
    [entries, filters],
  );
  const filteredTotals = useMemo(() => sumEntries(filteredEntries), [filteredEntries]);
  // Derived from every entry, not just the filtered ones — a filter on the
  // timesheet should not empty the picker on the clock screen.
  const jobTitles = useMemo(() => recentJobTitles(entries), [entries]);
  const totals = useMemo(() => periodTotals(entries, new Date(nowMs)), [entries, nowMs]);
  // Breakdown follows the filters so the chart always explains the table below it.
  const breakdown = useMemo(
    () => clientBreakdown(filteredEntries, state.clients),
    [filteredEntries, state.clients],
  );

  const activeEntry = useMemo(
    () => entries.find((entry) => entry.id === state.timer.activeEntryId) ?? null,
    [entries, state.timer.activeEntryId],
  );

  const resolveRateSpec = useCallback<UseTimeTracker['resolveRateSpec']>(
    (clientId, projectId) => {
      const project = projectId ? state.projects.find((p) => p.id === projectId) : undefined;
      if (project?.rate) return { rate: project.rate, source: 'project' };
      const client = clientId ? state.clients.find((c) => c.id === clientId) : undefined;
      return { rate: client?.defaultRate ?? makeRate(0), source: 'client' };
    },
    [state.clients, state.projects],
  );

  // Normalized once per render: every conversion below reads the same schedule,
  // and a corrupt or missing value can never reach the arithmetic.
  const workSchedule = useMemo(
    () => normalizeSchedule(state.settings.workSchedule),
    [state.settings.workSchedule],
  );

  const resolveRate = useCallback(
    (clientId: string, projectId: string | null): number =>
      toHourlyRate(resolveRateSpec(clientId, projectId).rate, workSchedule),
    [resolveRateSpec, workSchedule],
  );

  const setRate = useCallback<UseTimeTracker['setRate']>(
    ({ clientId, projectId }, rate) => {
      // A project rate overrides its client's, so writing to the project when one
      // is selected is what the user means by "the rate for this work".
      if (projectId) dispatch({ type: 'project/update', id: projectId, patch: { rate } });
      else dispatch({ type: 'client/update', id: clientId, patch: { defaultRate: rate } });

      // Finished entries keep the rate they were billed at — that is history.
      // The session still on the clock has not been billed yet, so a rate set
      // mid-session applies to it; otherwise you would have to stop and restart
      // the timer just to correct a rate you mistyped.
      const active = state.entries.find((entry) => entry.id === state.timer.activeEntryId);
      const affectsActive =
        active &&
        active.clientId === clientId &&
        (projectId ? active.projectId === projectId : active.projectId === null);
      if (affectsActive) {
        dispatch({
          type: 'entry/update',
          id: active.id,
          patch: { rateApplied: toHourlyRate(rate, workSchedule), rateQuoted: rate },
        });
      }
    },
    [state.entries, state.timer.activeEntryId, workSchedule],
  );

  const overtimePolicyFor = useCallback<UseTimeTracker['overtimePolicyFor']>(
    (clientId) => {
      const override = clientId
        ? state.clients.find((client) => client.id === clientId)?.overtimePolicy
        : null;
      return {
        policy: normalizePolicy(override ?? state.settings.overtimePolicy),
        isClientOverride: Boolean(override),
      };
    },
    [state.clients, state.settings.overtimePolicy],
  );

  const setOvertimePolicy = useCallback<UseTimeTracker['setOvertimePolicy']>(
    (patch, target) => {
      const clientId = target?.clientId ?? null;
      if (clientId) {
        const current = overtimePolicyFor(clientId).policy;
        dispatch({
          type: 'client/update',
          id: clientId,
          patch: { overtimePolicy: normalizePolicy({ ...current, ...patch }) },
        });
        return;
      }
      dispatch({
        type: 'settings/update',
        patch: { overtimePolicy: normalizePolicy({ ...state.settings.overtimePolicy, ...patch }) },
      });
      // Dropping back to the global policy means clearing every client override
      // that was set from this control — otherwise the global edit looks ignored.
    },
    [overtimePolicyFor, state.settings.overtimePolicy],
  );

  const clearClientOvertimePolicy = useCallback((clientId: string) => {
    dispatch({ type: 'client/update', id: clientId, patch: { overtimePolicy: null } });
  }, []);

  const setWorkSchedule = useCallback<UseTimeTracker['setWorkSchedule']>(
    (patch) => {
      dispatch({
        type: 'settings/update',
        patch: { workSchedule: normalizeSchedule({ ...workSchedule, ...patch }) },
      });
    },
    [workSchedule],
  );

  const projectsForClient = useCallback(
    (clientId: string) => state.projects.filter((p) => p.clientId === clientId && !p.archived),
    [state.projects],
  );

  // --- Commands -----------------------------------------------------------
  const startTimer = useCallback<UseTimeTracker['startTimer']>(
    (input) => {
      const projectId = input.projectId ?? null;
      const client = state.clients.find((c) => c.id === input.clientId);
      dispatch({
        type: 'timer/start',
        at: new Date().toISOString(),
        input: {
          clientId: input.clientId,
          projectId,
          description: input.description ?? '',
          isBillable: input.isBillable ?? true,
          rateApplied: input.rateApplied ?? resolveRate(input.clientId, projectId),
          rateQuoted: input.rateQuoted ?? resolveRateSpec(input.clientId, projectId).rate,
          currency: input.currency ?? client?.currency ?? state.settings.defaultCurrency,
        },
      });
    },
    [state.clients, state.settings.defaultCurrency, resolveRate, resolveRateSpec],
  );

  const pauseTimer = useCallback(() => {
    dispatch({ type: 'timer/pause', at: new Date().toISOString() });
  }, []);
  const resumeTimer = useCallback(() => {
    dispatch({ type: 'timer/resume', at: new Date().toISOString() });
  }, []);
  const stopTimer = useCallback(() => {
    dispatch({ type: 'timer/stop', at: new Date().toISOString() });
  }, []);
  const discardTimer = useCallback(() => dispatch({ type: 'timer/discard' }), []);

  const addManualEntry = useCallback((input: ManualEntryInput) => {
    dispatch({ type: 'entry/addManual', input });
  }, []);
  const updateEntry = useCallback((id: string, patch: Partial<TimeEntry>) => {
    dispatch({ type: 'entry/update', id, patch });
  }, []);
  const deleteEntry = useCallback((id: string) => dispatch({ type: 'entry/delete', id }), []);

  const addClient = useCallback<UseTimeTracker['addClient']>(
    ({ name, defaultRate, currency }) => {
      const client: Client = {
        id: createId(),
        name,
        defaultRate: defaultRate ?? makeRate(0),
        currency: currency ?? state.settings.defaultCurrency,
        color: CLIENT_COLORS[state.clients.length % CLIENT_COLORS.length] ?? '#6366f1',
        archived: false,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'client/add', client });
      return client;
    },
    [state.clients.length, state.settings.defaultCurrency],
  );

  const updateClient = useCallback((id: string, patch: Partial<Client>) => {
    dispatch({ type: 'client/update', id, patch });
  }, []);
  const deleteClient = useCallback((id: string) => dispatch({ type: 'client/delete', id }), []);

  const addProject = useCallback<UseTimeTracker['addProject']>(
    ({ clientId, name, rate = null }) => {
      const project: Project = {
        id: createId(),
        clientId,
        name,
        rate,
        archived: false,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'project/add', project });
      return project;
    },
    [],
  );

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    dispatch({ type: 'project/update', id, patch });
  }, []);
  const deleteProject = useCallback((id: string) => dispatch({ type: 'project/delete', id }), []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    dispatch({ type: 'settings/update', patch });
  }, []);

  const setFilters = useCallback((patch: Partial<TimesheetFilters>) => {
    setFiltersState((current) => ({ ...current, ...patch }));
  }, []);
  const resetFilters = useCallback(() => setFiltersState(DEFAULT_FILTERS), []);

  const resetAll = useCallback(() => {
    void adapter.clear();
    dispatch({ type: 'hydrate', state: createEmptyState() });
  }, [adapter]);

  return {
    isHydrated,
    clients: state.clients,
    projects: state.projects,
    settings: state.settings,
    filters,
    setFilters,
    resetFilters,
    activeEntry,
    isRunning,
    elapsedSeconds: activeEntry?.liveSeconds ?? 0,
    accruedEarnings: activeEntry?.earnings ?? 0,
    entries,
    jobTitles,
    filteredEntries,
    filteredTotals,
    totals,
    breakdown,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    discardTimer,
    addManualEntry,
    updateEntry,
    deleteEntry,
    addClient,
    updateClient,
    deleteClient,
    addProject,
    updateProject,
    deleteProject,
    updateSettings,
    resolveRate,
    resolveRateSpec,
    setRate,
    workSchedule,
    setWorkSchedule,
    overtimePolicyFor,
    setOvertimePolicy,
    clearClientOvertimePolicy,
    projectsForClient,
    resetAll,
  };
}
