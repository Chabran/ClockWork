import type { RoundingRule } from '@/lib/types';

/** Increment size, in seconds, for each billing rule. */
const INCREMENT_SECONDS: Record<RoundingRule, number> = {
  exact: 1,
  'nearest-6-min': 6 * 60, // 0.1 hour — the agency standard
  'nearest-15-min': 15 * 60,
  'up-15-min': 15 * 60,
};

export const ROUNDING_LABELS: Record<RoundingRule, string> = {
  exact: 'Exact time',
  'nearest-6-min': 'Nearest 6 min (0.1 h)',
  'nearest-15-min': 'Nearest 15 min',
  'up-15-min': 'Round up to 15 min',
};

/**
 * Applies a billing rounding rule to a raw duration.
 *
 * Rounding is a PRESENTATION concern, never a storage one: we always keep the
 * exact tracked seconds and round at read time. That way changing the rule
 * re-prices history instantly and no data is ever lost.
 */
export function applyRounding(seconds: number, rule: RoundingRule): number {
  if (seconds <= 0) return 0;
  const increment = INCREMENT_SECONDS[rule];
  if (increment <= 1) return Math.round(seconds);

  if (rule === 'up-15-min') return Math.ceil(seconds / increment) * increment;

  const rounded = Math.round(seconds / increment) * increment;
  // Any tracked work bills at least one increment — never round a real session to zero.
  return rounded === 0 ? increment : rounded;
}

/** Decimal hours as they appear on an invoice line, e.g. 2.25. */
export function toDecimalHours(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100;
}

/** Money for a duration. Non-billable work is worth 0 by definition. */
export function calculateEarnings(
  seconds: number,
  hourlyRate: number,
  isBillable: boolean,
): number {
  if (!isBillable) return 0;
  return Math.round((seconds / 3600) * hourlyRate * 100) / 100;
}
