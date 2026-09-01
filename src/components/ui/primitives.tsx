'use client';

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

/**
 * Tiny local primitives instead of a component library.
 *
 * The point is consistency, not abstraction: every button in the app gets the
 * same height, radius, focus ring and disabled treatment because there is only
 * one place those decisions are written down.
 */

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:opacity-90',
  secondary: 'bg-surface-muted text-ink hover:bg-line',
  ghost: 'text-ink-muted hover:bg-surface-muted hover:text-ink',
  danger: 'text-danger hover:bg-danger/10',
};

export function Button({
  variant = 'secondary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition',
        'disabled:cursor-not-allowed disabled:opacity-40',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn('rounded-2xl border border-line bg-surface p-5 shadow-sm', className)}
    >
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}

/**
 * Same look as `Field`, but a <div> instead of a <label>.
 *
 * Only form controls (input, select, textarea…) are "labelable" — wrapping a
 * <button> in a <label> makes screen readers announce the label as the button's
 * own name and swallows whatever the button says. Use this for a control that
 * opens a dialog, and give the button its own aria-label.
 */
export function LabeledGroup({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
    </div>
  );
}

const CONTROL =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 transition focus:border-accent';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL, 'appearance-none pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  labelOn,
  labelOff,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition',
        checked
          ? 'border-transparent bg-accent-soft text-accent'
          : 'border-line text-ink-muted hover:text-ink',
      )}
    >
      <span
        className={cn('size-1.5 rounded-full', checked ? 'bg-accent' : 'bg-ink-muted')}
        aria-hidden
      />
      {checked ? labelOn : labelOff}
    </button>
  );
}

export function Badge({ color, children }: { color?: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink">
      {color ? (
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      ) : null}
      {children}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-sm text-sm text-ink-muted">{body}</p>
    </div>
  );
}
