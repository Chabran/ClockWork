'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTracker } from '@/state/TrackerProvider';
import { ClientSelector } from '@/components/ClientSelector';
import { JobTitleField } from '@/components/JobTitleField';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button, Toggle } from '@/components/ui/primitives';
import { formatHMS, formatMoney } from '@/lib/time/format';
import { formatRate } from '@/lib/time/rates';

/**
 * The clock, alone on its own screen.
 *
 */
export function ClockScreen() {
  const {
    isHydrated,
    activeEntry,
    isRunning,
    elapsedSeconds,
    accruedEarnings,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    discardTimer,
    updateEntry,
    clients,
    resolveRate,
    resolveRateSpec,
    jobTitles,
  } = useTracker();

  const [draftClientId, setDraftClientId] = useState<string | null>(null);
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);

  /**
   * Mirror the active entry into the form when the SESSION changes — not on
   * every tick.
   *
   * `activeEntry` is derived data: it is rebuilt every second while the clock
   * runs, so it is a new object each time even when nothing about it changed.
   * Syncing on the object re-ran this effect once a second and overwrote
   * whatever the user was typing into the task field. Syncing on the entry's
   * identity loads it once, then leaves the form to the user.
   */
  const syncedEntryId = useRef<string | null>(null);
  useEffect(() => {
    const id = activeEntry?.id ?? null;
    if (id === syncedEntryId.current) return;
    syncedEntryId.current = id;
    if (!activeEntry) return;
    setDraftClientId(activeEntry.clientId);
    setDraftProjectId(activeEntry.projectId);
    setDescription(activeEntry.description);
    setIsBillable(activeEntry.isBillable);
  }, [activeEntry]);

  useEffect(() => {
    if (!draftClientId && !activeEntry && clients.length > 0) {
      setDraftClientId(clients[0]?.id ?? null);
    }
  }, [clients, draftClientId, activeEntry]);

  /**
   * Start on the last job title you used.
   *
   * Most sessions repeat the previous one, so pre-filling saves a step. It runs
   * ONCE, guarded by a ref: without that, clearing the field would refill it on
   * the next render and the field would be impossible to empty. Same principle
   * as the price and overtime fields — propose, then get out of the way.
   */
  const didPrefillTitle = useRef(false);
  useEffect(() => {
    if (didPrefillTitle.current || !isHydrated || activeEntry) return;
    didPrefillTitle.current = true;
    const last = jobTitles[0];
    if (last) setDescription(last);
  }, [isHydrated, activeEntry, jobTitles]);

  const clientId = activeEntry?.clientId ?? draftClientId;
  const projectId = activeEntry?.projectId ?? draftProjectId;
  const currency = clients.find((client) => client.id === clientId)?.currency ?? 'USD';
  const quotedRate = activeEntry?.rateQuoted ?? resolveRateSpec(clientId, projectId).rate;

  const commit = (patch: Parameters<typeof updateEntry>[1]) => {
    if (activeEntry) updateEntry(activeEntry.id, patch);
  };

  const handleStart = () => {
    if (!draftClientId) return;
    startTimer({
      clientId: draftClientId,
      projectId: draftProjectId,
      description: description.trim(),
      isBillable,
    });
  };

  const status = isRunning ? 'On the clock' : activeEntry ? 'Paused' : 'Off the clock';

  return (
    // h-[100dvh] + overflow-y-auto rather than min-h-screen: the page is sized
    // to FIT the viewport (every element below scales with clamp()s tied to
    // vh), so scrolling is never needed in practice. overflow-y-auto stays on
    // only as a safety net for an extreme case (huge zoom, a tiny window) —
    // it never triggers under normal use, it just stops content from being
    // truly unreachable if it ever does.
    <div className="flex h-[100dvh] flex-col overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
      <header className="mx-auto flex w-full max-w-xl shrink-0 items-center justify-between">
        <span className="text-sm font-semibold tracking-tight text-ink">Clockwork</span>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-xl min-h-0 flex-1 flex-col justify-center gap-[clamp(1.25rem,4vh,2rem)] py-[clamp(0.5rem,2.5vh,1.5rem)]">
        {/* --- the clock face --- */}
        <div className="text-center">
          <p className="flex items-center justify-center gap-2 text-xs font-medium tracking-[0.14em] text-ink-muted uppercase">
            <span
              className={`size-2 rounded-full ${isRunning ? 'animate-pulse bg-positive' : 'bg-ink-muted/40'}`}
              aria-hidden
            />
            {status}
          </p>

          {/* clamp(min, vh-scaled, max) instead of a fixed text-6xl/7xl: the
              digits are the single biggest thing on the page, so they are what
              gives a short window (a small laptop, a landscape phone) its room
              back. The max matches the old sm:text-7xl exactly, so nothing
              shrinks on a normal-height screen. */}
          <p
            className="tabular mt-[clamp(0.5rem,2vh,1rem)] text-[clamp(2.75rem,9vh,4.5rem)] leading-none font-semibold tracking-tight text-ink"
            aria-label={`Elapsed time ${formatHMS(elapsedSeconds)}`}
          >
            {isHydrated ? formatHMS(elapsedSeconds) : '00:00:00'}
          </p>

          <p className="mt-3 text-sm text-ink-muted">
            {activeEntry && !activeEntry.isBillable ? (
              'Non-billable — tracked, not charged'
            ) : (
              <>
                <span className="tabular font-medium text-positive">
                  {formatMoney(accruedEarnings, currency)}
                </span>{' '}
                at {formatRate(quotedRate, currency)}
              </>
            )}
          </p>
        </div>

        {/* --- the one control that matters --- */}
        <div className="flex flex-col items-center gap-3">
          {!activeEntry ? (
            <Button
              variant="primary"
              onClick={handleStart}
              disabled={!draftClientId || !isHydrated}
              className="w-full max-w-xs justify-center py-4 text-base"
            >
              Clock in
            </Button>
          ) : (
            <>
              <div className="flex w-full max-w-xs gap-2">
                {isRunning ? (
                  <Button onClick={pauseTimer} className="flex-1 justify-center py-4 text-base">
                    Pause
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={resumeTimer}
                    className="flex-1 justify-center py-4 text-base"
                  >
                    Resume
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={stopTimer}
                  className="flex-1 justify-center py-4 text-base"
                >
                  Clock out
                </Button>
              </div>
              <Button variant="danger" onClick={discardTimer} className="px-3 py-1 text-xs">
                Discard this session
              </Button>
            </>
          )}
        </div>

        {/* --- who and what: quiet, but always editable --- */}
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <ClientSelector
            showRate
            clientId={clientId}
            projectId={projectId}
            onChange={({ clientId: nextClient, projectId: nextProject }) => {
              setDraftClientId(nextClient);
              setDraftProjectId(nextProject);
              if (activeEntry && nextClient) {
                commit({
                  clientId: nextClient,
                  projectId: nextProject,
                  rateApplied: resolveRate(nextClient, nextProject),
                  rateQuoted: resolveRateSpec(nextClient, nextProject).rate,
                });
              }
            }}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <JobTitleField
              className="flex-1"
              value={description}
              onChange={setDescription}
              onCommit={(next) => commit({ description: next.trim() })}
              onSubmit={() => {
                if (!activeEntry) handleStart();
              }}
            />
            {/* self-start so the pill keeps its own width when the row stacks
                on a phone, instead of stretching the full width like a button. */}
            <div className="self-start">
              <Toggle
                checked={isBillable}
                labelOn="Billable"
                labelOff="Non-billable"
                onChange={(next) => {
                  setIsBillable(next);
                  commit({ isBillable: next });
                }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* The one way out of this screen. `shrink-0` keeps it pinned at its
          full size even if something above ever runs tight on room — it is
          the one element on this page that must never be what gets squeezed
          out of view. Bigger and easier to hit than before; still tinted
          rather than solid so it doesn't compete with Clock in for the eye. */}
      <footer className="mx-auto w-full max-w-xl shrink-0 pt-2 pb-3 text-center">
        <Link
          href="/timesheet"
          className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-6 py-4 text-lg font-semibold text-accent transition hover:border-accent/60 hover:brightness-[0.98]"
        >
          Timesheet &amp; invoicing
          <span aria-hidden>→</span>
        </Link>
      </footer>
    </div>
  );
}
