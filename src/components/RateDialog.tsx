'use client';

import { useEffect, useState } from 'react';
import { useTracker } from '@/state/TrackerProvider';
import { Modal } from '@/components/ui/Modal';
import { Button, Field, Input, LabeledGroup, cn } from '@/components/ui/primitives';
import { formatMoney } from '@/lib/time/format';
import {
  PERIOD_LABELS,
  PERIOD_UNIT,
  billableHours,
  convertAmount,
  formatRate,
  toHourlyRate,
} from '@/lib/time/rates';
import { RATE_PERIODS, type Rate, type RatePeriod } from '@/lib/types';

/**
 * The Rate control: a button showing the rate in force, and the dialog that
 * changes it.
 *
 * Two product decisions worth naming:
 *
 * 1. Rate setting is its own destination, not a field buried in "new client".
 *    Rates change far more often than clients get created — a raise, a
 *    retainer, a different scope — so it needs to be reachable at any moment,
 *    not only at the instant a client is first added.
 *
 * 2. The period is chosen FIRST, then the number. "$4,800" means nothing until
 *    you know whether it is a week or a month, so the app asks in that order
 *    and shows the hourly equivalent underneath as confirmation.
 */
export function RateControl({
  clientId,
  projectId,
  disabled,
}: {
  clientId: string | null;
  projectId: string | null;
  disabled?: boolean;
}) {
  const { clients, resolveRateSpec, setRate } = useTracker();
  const [open, setOpen] = useState(false);

  const { rate, source } = resolveRateSpec(clientId, projectId);
  const currency = clients.find((client) => client.id === clientId)?.currency ?? 'USD';

  return (
    <>
      <LabeledGroup
        label="Rate"
        hint={clientId ? `${source === 'project' ? 'Project' : 'Client'} rate` : undefined}
      >
        <Button
          onClick={() => setOpen(true)}
          disabled={disabled || !clientId}
          aria-label={`Rate: ${rate.amount > 0 ? formatRate(rate, currency) : 'not set'}. Change it.`}
          className="w-full justify-between font-normal"
        >
          <span className="tabular font-medium">
            {rate.amount > 0 ? formatRate(rate, currency) : 'Set rate'}
          </span>
          <span aria-hidden className="text-ink-muted">
            ›
          </span>
        </Button>
      </LabeledGroup>

      {open && clientId ? (
        <RateDialog
          clientId={clientId}
          projectId={projectId}
          currentRate={rate}
          appliesTo={source}
          currency={currency}
          onClose={() => setOpen(false)}
          onSave={(next, target) => {
            setRate({ clientId, projectId: target === 'project' ? projectId : null }, next);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function RateDialog({
  clientId,
  projectId,
  currentRate,
  appliesTo,
  currency,
  onClose,
  onSave,
}: {
  clientId: string;
  projectId: string | null;
  currentRate: Rate;
  appliesTo: 'project' | 'client';
  currency: string;
  onClose: () => void;
  onSave: (rate: Rate, target: 'project' | 'client') => void;
}) {
  const {
    clients,
    projects,
    workSchedule,
    setWorkSchedule,
    overtimePolicyFor,
    setOvertimePolicy,
    clearClientOvertimePolicy,
  } = useTracker();
  const { policy, isClientOverride } = overtimePolicyFor(clientId);
  const [showSchedule, setShowSchedule] = useState(false);
  const [period, setPeriod] = useState<RatePeriod>(currentRate.period);
  const [amount, setAmount] = useState(currentRate.amount ? String(currentRate.amount) : '');
  const [target, setTarget] = useState<'project' | 'client'>(projectId ? appliesTo : 'client');

  // Keep the number meaningful when the period changes: convert it rather than
  // leaving "$95" sitting under a "Monthly" label. The conversion runs through
  // the user's own schedule, so a 12-hour day gives 12-hour-day answers.
  const changePeriod = (next: RatePeriod) => {
    const value = Number(amount);
    if (Number.isFinite(value) && value > 0) {
      setAmount(String(convertAmount(value, period, next, workSchedule)));
    }
    setPeriod(next);
  };

  useEffect(() => {
    if (!projectId) setTarget('client');
  }, [projectId]);

  const value = Number(amount);
  const isValid = Number.isFinite(value) && value > 0;
  const hourly = isValid ? toHourlyRate({ amount: value, period }, workSchedule) : 0;
  const hoursInPeriod = billableHours(workSchedule)[period];

  const clientName = clients.find((client) => client.id === clientId)?.name ?? 'this client';
  const projectName = projects.find((project) => project.id === projectId)?.name;

  return (
    <Modal
      open
      title="Rate"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!isValid}
            onClick={() => onSave({ amount: value, period }, target)}
          >
            Save rate
          </Button>
        </>
      }
    >
      {/* Period first — the number is meaningless without it. */}
      <LabeledGroup label="Billing period">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {RATE_PERIODS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={period === option}
              onClick={() => changePeriod(option)}
              className={cn(
                'rounded-lg border px-2 py-2 text-sm font-medium transition',
                period === option
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line text-ink-muted hover:border-ink-muted hover:text-ink',
              )}
            >
              {PERIOD_LABELS[option]}
            </button>
          ))}
        </div>
      </LabeledGroup>

      <Field label={`Amount per ${PERIOD_UNIT[period]}`}>
        <Input
          autoFocus
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0"
          className="tabular text-lg"
        />
      </Field>

      {/* The conversion and the assumption behind it, together. Showing the
          number without letting the user change it is what made an 8-hour day
          feel like a fact instead of a setting. */}
      {period === 'hourly' ? (
        <p className="text-xs text-ink-muted">Billed exactly as tracked.</p>
      ) : (
        <div className="rounded-xl border border-line bg-surface-muted p-3">
          <p className="text-sm text-ink">
            {isValid ? (
              <>
                Works out to{' '}
                <span className="tabular font-semibold">{formatMoney(hourly, currency)}/h</span>
              </>
            ) : (
              'Enter an amount greater than zero.'
            )}
          </p>
          <button
            type="button"
            onClick={() => setShowSchedule((open) => !open)}
            className="mt-1 text-xs text-accent underline underline-offset-2 hover:opacity-80"
          >
            based on {round(hoursInPeriod)} billable hours per {PERIOD_UNIT[period]} · adjust
          </button>

          {showSchedule ? (
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
              <ScheduleInput
                label="Hours / day"
                value={workSchedule.hoursPerDay}
                min={0.5}
                max={24}
                onChange={(hoursPerDay) => setWorkSchedule({ hoursPerDay })}
              />
              <ScheduleInput
                label="Days / week"
                value={workSchedule.daysPerWeek}
                min={1}
                max={7}
                onChange={(daysPerWeek) => setWorkSchedule({ daysPerWeek })}
              />
              <ScheduleInput
                label="Weeks / year"
                value={workSchedule.weeksPerYear}
                min={1}
                max={52}
                onChange={(weeksPerYear) => setWorkSchedule({ weeksPerYear })}
              />
              <p className="col-span-3 text-xs text-ink-muted">
                Your working day drives every daily, weekly and monthly conversion. Changing it
                re-prices quoted rates from here on — time already logged keeps what it was billed
                at.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Overtime terms live with the rate, because that is what they are: the
          price of hours past a threshold. Set once, applied automatically. */}
      <div className="rounded-xl border border-line bg-surface-muted p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Overtime
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={policy.enabled}
            onClick={() =>
              setOvertimePolicy(
                { enabled: !policy.enabled },
                isClientOverride ? { clientId } : undefined,
              )
            }
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition',
              policy.enabled
                ? 'border-transparent bg-accent-soft text-accent'
                : 'border-line text-ink-muted hover:text-ink',
            )}
          >
            <span
              className={cn('size-1.5 rounded-full', policy.enabled ? 'bg-accent' : 'bg-ink-muted')}
              aria-hidden
            />
            {policy.enabled ? 'Automatic' : 'Off'}
          </button>
        </div>

        {policy.enabled ? (
          <>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <span className="pb-2.5 text-sm text-ink-muted">After</span>
              <label className="flex flex-col gap-1">
                <span className="sr-only">Threshold hours</span>
                <Input
                  type="number"
                  min="0.25"
                  max="24"
                  step="0.5"
                  inputMode="decimal"
                  value={policy.thresholdHours}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next) && next > 0) {
                      setOvertimePolicy(
                        { thresholdHours: next },
                        isClientOverride ? { clientId } : undefined,
                      );
                    }
                  }}
                  className="tabular w-20"
                />
              </label>
              <span className="pb-2.5 text-sm text-ink-muted">h on one entry, bill the rest at</span>
              <label className="flex items-end gap-1.5">
                <span className="sr-only">Overtime multiplier</span>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  step="0.25"
                  inputMode="decimal"
                  value={policy.multiplier}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next) && next >= 1) {
                      setOvertimePolicy(
                        { multiplier: next },
                        isClientOverride ? { clientId } : undefined,
                      );
                    }
                  }}
                  className="tabular w-20"
                />
                <span className="pb-2.5 text-sm text-ink-muted">×</span>
              </label>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              A {policy.thresholdHours + 2} h session bills {policy.thresholdHours} h at{' '}
              {formatMoney(hourly || toHourlyRate(currentRate, workSchedule), currency)}/h and 2 h at{' '}
              {formatMoney(
                (hourly || toHourlyRate(currentRate, workSchedule)) * policy.multiplier,
                currency,
              )}
              /h. You can still override it on any entry.
            </p>
          </>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {isClientOverride ? (
            <>
              <span className="text-xs text-accent">Terms for {clientName} only.</span>
              <button
                type="button"
                onClick={() => clearClientOvertimePolicy(clientId)}
                className="text-xs text-accent underline underline-offset-2 hover:opacity-80"
              >
                Use the global terms instead
              </button>
            </>
          ) : (
            <>
              <span className="text-xs text-ink-muted">Applies to every client.</span>
              <button
                type="button"
                onClick={() => setOvertimePolicy({ ...policy }, { clientId })}
                className="text-xs text-accent underline underline-offset-2 hover:opacity-80"
              >
                Set different terms for {clientName}
              </button>
            </>
          )}
        </div>
      </div>

      {projectId ? (
        <LabeledGroup label="Applies to">
          <div className="grid grid-cols-2 gap-2">
            <TargetOption
              active={target === 'project'}
              title={projectName ?? 'This project'}
              subtitle="This project only"
              onClick={() => setTarget('project')}
            />
            <TargetOption
              active={target === 'client'}
              title={clientName}
              subtitle="Default for all their work"
              onClick={() => setTarget('client')}
            />
          </div>
        </LabeledGroup>
      ) : (
        <p className="text-xs text-ink-muted">
          Saves as {clientName}&rsquo;s default rate. Entries already logged keep the rate they were
          billed at.
        </p>
      )}
    </Modal>
  );
}

function ScheduleInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">
        {label}
      </span>
      <Input
        type="number"
        min={min}
        max={max}
        step="any"
        inputMode="decimal"
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && next > 0) onChange(next);
        }}
        className="tabular"
      />
    </label>
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function TargetOption({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-2 text-left transition',
        active ? 'border-accent bg-accent-soft' : 'border-line hover:border-ink-muted',
      )}
    >
      <span className={cn('block truncate text-sm font-medium', active ? 'text-accent' : 'text-ink')}>
        {title}
      </span>
      <span className="block text-xs text-ink-muted">{subtitle}</span>
    </button>
  );
}
