import type { Client, PersistedState, Project, Settings, TimesheetFilters } from '@/lib/types';
import { DEFAULT_OVERTIME_POLICY, DEFAULT_WORK_SCHEDULE, makeRate } from '@/lib/time/rates';

export const CLIENT_COLORS = [
  '#6366f1',
  '#14b8a6',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#22c55e',
  '#ef4444',
  '#0ea5e9',
] as const;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  defaultCurrency: 'USD',
  roundingRule: 'exact',
  invoiceFromName: 'Your Studio',
  workSchedule: { ...DEFAULT_WORK_SCHEDULE },
  overtimePolicy: { ...DEFAULT_OVERTIME_POLICY },
};

export const DEFAULT_FILTERS: TimesheetFilters = {
  clientId: 'all',
  projectId: 'all',
  billable: 'all',
  from: null,
  to: null,
  search: '',
  sort: 'newest',
};

/** Crypto-strong id with a graceful fallback for older browsers. */
export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyState(): PersistedState {
  return {
    version: 1,
    clients: [],
    projects: [],
    entries: [],
    timer: { activeEntryId: null, isRunning: false, startedAt: null },
    settings: { ...DEFAULT_SETTINGS },
  };
}

/**
 * Seed data so a brand-new user sees a working dashboard instead of an empty
 * shell. Only ever applied when storage is completely empty.
 */
export function createSeedState(): PersistedState {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  const clients: Client[] = [
    {
      id: 'client-northwind',
      name: 'Northwind Studio',
      defaultRate: makeRate(95, 'hourly'),
      currency: 'USD',
      color: CLIENT_COLORS[0],
      archived: false,
      createdAt: iso(now),
    },
    {
      id: 'client-lumen',
      name: 'Lumen Labs',
      defaultRate: makeRate(7200, 'weekly'),
      currency: 'USD',
      color: CLIENT_COLORS[1],
      archived: false,
      createdAt: iso(now),
    },
  ];

  const projects: Project[] = [
    {
      id: 'project-brand',
      clientId: 'client-northwind',
      name: 'Brand refresh',
      rate: null,
      archived: false,
      createdAt: iso(now),
    },
    {
      id: 'project-app',
      clientId: 'client-lumen',
      name: 'Mobile app v2',
      rate: makeRate(1620, 'daily'),
      archived: false,
      createdAt: iso(now),
    },
  ];

  const state = createEmptyState();
  state.clients = clients;
  state.projects = projects;
  state.entries = [
    {
      id: createId(),
      clientId: 'client-northwind',
      projectId: 'project-brand',
      description: 'Launch day — press assets and fixes',
      startTime: iso(minutesAgo(2000)),
      endTime: iso(minutesAgo(1160)),
      durationSeconds: 14 * 3600,
      isBillable: true,
      rateApplied: 95,
      rateQuoted: makeRate(95, 'hourly'),
      currency: 'USD',
      createdAt: iso(now),
      updatedAt: iso(now),
    },
    {
      id: createId(),
      clientId: 'client-lumen',
      projectId: 'project-app',
      description: 'Onboarding flow wireframes',
      startTime: iso(minutesAgo(320)),
      endTime: iso(minutesAgo(180)),
      durationSeconds: 140 * 60,
      isBillable: true,
      rateApplied: 135,
      rateQuoted: makeRate(1620, 'daily'),
      currency: 'USD',
      createdAt: iso(now),
      updatedAt: iso(now),
    },
    {
      id: createId(),
      clientId: 'client-northwind',
      projectId: 'project-brand',
      description: 'Logo exploration round 2',
      startTime: iso(minutesAgo(1500)),
      endTime: iso(minutesAgo(1387)),
      durationSeconds: 113 * 60,
      isBillable: true,
      rateApplied: 95,
      rateQuoted: makeRate(95, 'hourly'),
      currency: 'USD',
      createdAt: iso(now),
      updatedAt: iso(now),
    },
    {
      id: createId(),
      clientId: 'client-northwind',
      projectId: null,
      description: 'Invoicing & admin',
      startTime: iso(minutesAgo(2900)),
      endTime: iso(minutesAgo(2855)),
      durationSeconds: 45 * 60,
      isBillable: false,
      rateApplied: 95,
      rateQuoted: makeRate(95, 'hourly'),
      currency: 'USD',
      createdAt: iso(now),
      updatedAt: iso(now),
    },
  ];

  return state;
}
