'use client';

import { useEffect, useState } from 'react';

/**
 * A ticking clock as a value.
 *
 * DRIFT COMPENSATION — the important part:
 * `setInterval(fn, 1000)` is not a clock. It is a "wake me roughly every
 * second" request that browsers throttle in background tabs (often to once a
 * minute) and skip entirely while a laptop is asleep. Counting ticks therefore
 * loses time.
 *
 * The fix is to never count ticks. We store an ABSOLUTE start timestamp and, on
 * every wake-up, ask `Date.now()` what time it actually is. Elapsed time is
 * `now - startedAt`. Missed ticks then cost you a stale display for a moment,
 * never a wrong duration — reopen the tab after two hours and the number is
 * instantly correct.
 *
 * We additionally re-align the interval to the next whole second so the display
 * flips in step with the wall clock instead of drifting a few ms per tick.
 */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!active) return;

    setNow(Date.now());
    let intervalId: ReturnType<typeof setInterval> | undefined;

    // Align the first tick to the next second boundary.
    const msToNextTick = intervalMs - (Date.now() % intervalMs);
    const timeoutId = setTimeout(() => {
      setNow(Date.now());
      intervalId = setInterval(() => setNow(Date.now()), intervalMs);
    }, msToNextTick);

    // Catch up the instant the tab becomes visible again.
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [active, intervalMs]);

  return now;
}
