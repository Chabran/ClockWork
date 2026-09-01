'use client';

import { useEffect, useRef, useState } from 'react';
import { useTracker } from '@/state/TrackerProvider';
import { ClientSelector } from '@/components/ClientSelector';
import { JobTitleField } from '@/components/JobTitleField';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, LabeledGroup, Toggle } from '@/components/ui/primitives';
import {
  formatDuration,
  formatMoney,
  fromDateTimeInputs,
  toDateInputValue,
  toTimeInputValue,
} from '@/lib/time/format';
import {
  autoOvertimeFor,
  formatRate,
  hourlyFromPrice,
  makeRate,
  normalizeOvertime,
  normalizePolicy,
  overtimeAmount,
  priceForDuration,
  splitOvertime,
} from '@/lib/time/rates';
import type { EnrichedEntry, OvertimeFee } from '@/lib/types';

interface FormState {
  clientId: string | null;
  projectId: string | null;
  description: string;
  date: string;
  start: string;
  end: string;
  isBillable: boolean;
  /** The entry's total price, as text. Kept in sync with the times until touched. */
  price: string;
  /** True once the user types their own number — then we stop recalculating. */
  priceDirty: boolean;
  /** Overtime hours, as text. Empty means none. */
  overtimeHours: string;
  /** 1.5 = time-and-a-half. Only meaningful when hours are set. */
  overtimeMultiplier: string;
  /** True once the user edits overtime — then the policy stops driving it. */
  overtimeDirty: boolean;
}

function blankForm(defaultClientId: string | null): FormState {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, '0');
  return {
    clientId: defaultClientId,
    projectId: null,
    description: '',
    date: toDateInputValue(now.toISOString()),
    start: `${hour}:00`,
    end: `${String(now.getHours() + 1).padStart(2, '0')}:00`,
    isBillable: true,
    price: '',
    priceDirty: false,
    overtimeHours: '',
    overtimeMultiplier: '1.5',
    overtimeDirty: false,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * One dialog for both "log time I forgot to track" and "fix an entry".
 *
 * Same fields, same validation, same duration preview — a separate edit dialog
 * would be a second place for the same bug to live.
 */
export function EntryEditorDialog({
  open,
  entry,
  onClose,
}: {
  open: boolean;
  entry: EnrichedEntry | null;
  onClose: () => void;
}) {
  const { clients, addManualEntry, updateEntry, resolveRate, resolveRateSpec, settings } =
    useTracker();
  const [form, setForm] = useState<FormState>(() => blankForm(clients[0]?.id ?? null));

  /**
   * Load the entry into the form ONCE per opening.
   *
   * `entry` is an EnrichedEntry — recomputed from scratch on every tick while a
   * timer runs, so it is a new object every second even when nothing changed.
   * Depending on the object itself re-ran this effect once a second and wiped
   * whatever the user was typing. Syncing on the entry's *identity* fixes it:
   * load on open, then leave the form alone.
   */
  const loadedKey = useRef<string | null>(null);
  useEffect(() => {
    const key = open ? (entry?.id ?? 'new') : null;
    if (key === loadedKey.current) return;
    loadedKey.current = key;
    if (!open) return;

    if (entry) {
      setForm({
        clientId: entry.clientId,
        projectId: entry.projectId,
        description: entry.description,
        date: toDateInputValue(entry.startTime),
        start: toTimeInputValue(entry.startTime),
        end: entry.endTime ? toTimeInputValue(entry.endTime) : toTimeInputValue(entry.startTime),
        isBillable: entry.isBillable,
        price: '',
        priceDirty: false,
        // An override recorded on the entry loads as-is and stays put; with no
        // override the fields follow the policy, like the price field does.
        overtimeHours: entry.overtime ? String(entry.overtime.hours || '') : '',
        overtimeMultiplier: String(entry.overtime?.multiplier ?? 1.5),
        overtimeDirty: entry.overtime !== undefined && entry.overtime !== null,
      });
    } else {
      setForm(blankForm(clients[0]?.id ?? null));
    }
  }, [open, entry, clients]);

  const patch = (next: Partial<FormState>) => setForm((current) => ({ ...current, ...next }));

  const startIso = form.date && form.start ? fromDateTimeInputs(form.date, form.start) : null;
  let endIso = form.date && form.end ? fromDateTimeInputs(form.date, form.end) : null;
  // An end time earlier than the start means the shift crossed midnight.
  if (startIso && endIso && new Date(endIso) < new Date(startIso)) {
    endIso = new Date(new Date(endIso).getTime() + 86_400_000).toISOString();
  }
  const durationSeconds =
    startIso && endIso ? (new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000 : 0;

  const hourlyRate = form.clientId ? resolveRate(form.clientId, form.projectId) : 0;
  const quotedRate = resolveRateSpec(form.clientId, form.projectId).rate;
  const currency =
    clients.find((client) => client.id === form.clientId)?.currency ?? settings.defaultCurrency;

  // --- Overtime, computed FIRST -------------------------------------------
  // The policy proposes; the user disposes. With no override on the entry the
  // fields track the automatic calculation as the times change; the moment the
  // user types, `overtimeDirty` freezes them and the entry carries an override.
  //
  // This has to run before the price, because automatic overtime carves hours
  // out of the tracked window — and the price field only ever shows the REGULAR
  // portion, so that "price + overtime = total" is true on screen and in the
  // invoice.
  const policy = normalizePolicy(
    clients.find((client) => client.id === form.clientId)?.overtimePolicy ??
      settings.overtimePolicy,
  );
  const autoOvertime = autoOvertimeFor(durationSeconds, policy);

  useEffect(() => {
    if (form.overtimeDirty) return;
    const hours = autoOvertime ? String(autoOvertime.hours) : '';
    const multiplier = String(autoOvertime?.multiplier ?? policy.multiplier);
    setForm((current) =>
      current.overtimeDirty ||
      (current.overtimeHours === hours && current.overtimeMultiplier === multiplier)
        ? current
        : { ...current, overtimeHours: hours, overtimeMultiplier: multiplier },
    );
  }, [autoOvertime, policy.multiplier, form.overtimeDirty]);

  const overtime: OvertimeFee | null = form.overtimeDirty
    ? normalizeOvertime({
        hours: Number(form.overtimeHours),
        multiplier: Number(form.overtimeMultiplier),
        source: 'manual',
      })
    : autoOvertime;

  const split = splitOvertime(overtime, durationSeconds);

  // --- Price of the regular hours -----------------------------------------
  // Follows the times (and the overtime split) until the user takes it over.
  // `priceDirty` is the whole mechanism — without it the field would either
  // fight the user or go stale.
  const calculatedPrice = priceForDuration(split.regularSeconds, hourlyRate);

  useEffect(() => {
    if (form.priceDirty) return;
    const next = durationSeconds > 0 ? String(calculatedPrice) : '';
    setForm((current) =>
      current.priceDirty || current.price === next ? current : { ...current, price: next },
    );
  }, [calculatedPrice, durationSeconds, form.priceDirty]);

  const priceValue = Number(form.price);
  const priceIsValid = form.price.trim() !== '' && Number.isFinite(priceValue) && priceValue >= 0;
  const isOverridden = form.priceDirty && priceIsValid && priceValue !== calculatedPrice;
  const isValid = Boolean(form.clientId && startIso && endIso && durationSeconds > 0 && priceIsValid);

  // An overridden price implies an hourly rate: price ÷ the regular hours it
  // pays for. Overtime is then priced off that same rate, so raising the price
  // raises the surcharge with it.
  const effectiveHourly =
    isOverridden && split.regularSeconds > 0
      ? hourlyFromPrice(priceValue, split.regularSeconds)
      : hourlyRate;

  const overtimePay = form.isBillable ? overtimeAmount(overtime, effectiveHourly) : 0;
  const regularPay = form.isBillable && priceIsValid ? priceValue : 0;
  const invoiceTotal = regularPay + overtimePay;

  const submit = () => {
    if (!isValid || !form.clientId || !startIso || !endIso) return;
    const shared = {
      clientId: form.clientId,
      projectId: form.projectId,
      description: form.description.trim(),
      startTime: startIso,
      endTime: endIso,
      isBillable: form.isBillable,
      rateApplied: effectiveHourly,
      rateQuoted: isOverridden ? makeRate(round2(effectiveHourly), 'hourly') : quotedRate,
      // Saving `null` leaves the entry on the policy, so it re-derives if the
      // times or the terms change later. Only an edit records an override.
      overtime: form.overtimeDirty ? (overtime ?? { hours: 0, multiplier: policy.multiplier, source: 'manual' as const }) : null,
      currency,
    };

    if (entry) updateEntry(entry.id, shared);
    else addManualEntry(shared);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={entry ? 'Edit entry' : 'Add time manually'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!isValid}>
            {entry ? 'Save changes' : 'Add entry'}
          </Button>
        </>
      }
    >
      <ClientSelector
        clientId={form.clientId}
        projectId={form.projectId}
        onChange={({ clientId, projectId }) => patch({ clientId, projectId })}
      />

      <LabeledGroup label="Job title">
        <JobTitleField
          value={form.description}
          onChange={(next) => patch({ description: next })}
        />
      </LabeledGroup>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Date">
          <Input
            type="date"
            value={form.date}
            onChange={(event) => patch({ date: event.target.value })}
          />
        </Field>
        <Field label="Start">
          <Input
            type="time"
            value={form.start}
            onChange={(event) => patch({ start: event.target.value })}
          />
        </Field>
        <Field label="End">
          <Input
            type="time"
            value={form.end}
            onChange={(event) => patch({ end: event.target.value })}
          />
        </Field>
      </div>

      <div className="rounded-xl border border-line bg-surface-muted p-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Field label="Price override" className="w-44">
            <Input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={form.price}
              placeholder={String(calculatedPrice)}
              onChange={(event) => patch({ price: event.target.value, priceDirty: true })}
              className="tabular text-lg"
            />
          </Field>
          <div className="flex items-center gap-3 pb-1">
            <Toggle
              checked={form.isBillable}
              labelOn="Billable"
              labelOff="Non-billable"
              onChange={(next) => patch({ isBillable: next })}
            />
            <span className="tabular text-sm text-ink-muted">
              {durationSeconds > 0 ? formatDuration(durationSeconds) : 'Check the times'}
            </span>
          </div>
        </div>

        <p className="mt-2 text-xs text-ink-muted">
          {durationSeconds <= 0 ? (
            'Set a valid start and end time.'
          ) : isOverridden ? (
            <>
              Custom price — {formatMoney(round2(effectiveHourly), currency)}/h for these{' '}
              {formatDuration(split.regularSeconds)}.{' '}
              <button
                type="button"
                onClick={() => patch({ price: String(calculatedPrice), priceDirty: false })}
                className="text-accent underline underline-offset-2 hover:opacity-80"
              >
                Use {formatMoney(calculatedPrice, currency)} instead
              </button>
            </>
          ) : (
            <>
              {formatDuration(split.regularSeconds)}
              {overtime?.source === 'auto' ? ' regular' : ''} at {formatRate(quotedRate, currency)}
              {quotedRate.period === 'hourly'
                ? ''
                : ` (${formatMoney(hourlyRate, currency)}/h)`}
              . Edit the amount to charge something else.
            </>
          )}
          {form.isBillable ? '' : ' This entry is non-billable, so nothing is charged.'}
        </p>

        {/* Overtime: two numbers and a running total. Extra billable hours at a
            multiplier, priced off the same hourly rate as the entry itself. */}
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-line pt-3">
          <Field label="Overtime hours" className="w-36">
            <Input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={form.overtimeHours}
              placeholder="0"
              onChange={(event) =>
                patch({ overtimeHours: event.target.value, overtimeDirty: true })
              }
              className="tabular"
            />
          </Field>
          <span className="pb-2.5 text-sm text-ink-muted">×</span>
          <Field label="Multiplier" className="w-28">
            <Input
              type="number"
              min="1"
              step="0.25"
              inputMode="decimal"
              value={form.overtimeMultiplier}
              onChange={(event) =>
                patch({ overtimeMultiplier: event.target.value, overtimeDirty: true })
              }
              className="tabular"
            />
          </Field>
          <p className="flex-1 pb-2 text-xs text-ink-muted">
            {overtime ? (
              <>
                <span className="tabular font-medium text-ink">
                  + {formatMoney(overtimePay, currency)}
                </span>{' '}
                — {overtime.hours} h at{' '}
                {formatMoney(round2(effectiveHourly * overtime.multiplier), currency)}/h
                {form.isBillable ? '' : ' (non-billable, not charged)'}{' '}
                {overtime.source === 'auto' ? (
                  <span className="rounded bg-accent-soft px-1.5 py-0.5 font-medium text-accent">
                    automatic
                  </span>
                ) : null}
              </>
            ) : policy.enabled ? (
              `No overtime — this entry is under your ${policy.thresholdHours} h threshold.`
            ) : (
              'Leave blank for none. 1.5 = time-and-a-half, 2 = double time.'
            )}
          </p>
        </div>

        {form.overtimeDirty && autoOvertime ? (
          <p className="mt-2 text-xs text-ink-muted">
            Overridden.{' '}
            <button
              type="button"
              onClick={() => patch({ overtimeDirty: false })}
              className="text-accent underline underline-offset-2 hover:opacity-80"
            >
              Back to automatic ({autoOvertime.hours} h × {autoOvertime.multiplier})
            </button>
          </p>
        ) : null}

        {overtime && form.isBillable ? (
          <p className="mt-2 border-t border-line pt-2 text-sm text-ink">
            Invoice total{' '}
            <span className="tabular font-semibold">{formatMoney(invoiceTotal, currency)}</span>
            <span className="text-ink-muted">
              {' '}
              = {formatMoney(regularPay, currency)} for{' '}
              {formatDuration(split.regularSeconds)} regular +{' '}
              {formatMoney(overtimePay, currency)} for {overtime.hours} h overtime
            </span>
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
