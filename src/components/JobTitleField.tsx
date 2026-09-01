'use client';

import { useEffect, useRef, useState } from 'react';
import { useTracker } from '@/state/TrackerProvider';
import { Input, cn } from '@/components/ui/primitives';

/**
 * A job title: type a new one, or pick one you have used before.
 *
 * This is a combo box rather than a plain select, because both halves matter —
 * most sessions repeat a title you already have, but the first time you do
 * anything it is new. Forcing a choice from a list would make the common case
 * fast and the uncommon case impossible.
 *
 * The options are DERIVED from your entries (see `recentJobTitles`), so the
 * list can never drift from your actual history and there is nothing extra to
 * keep, prune or migrate.
 */
export function JobTitleField({
  value,
  onChange,
  onCommit,
  onSubmit,
  autoFocus,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Called when the field loses focus or a title is picked — persist here. */
  onCommit?: (next: string) => void;
  /** Enter pressed in the field. */
  onSubmit?: () => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const { jobTitles } = useTracker();
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  /**
   * Typing narrows the list — but a value that IS one of the titles (because it
   * was pre-filled or picked) shows everything, so the menu still works as a
   * browse-all rather than collapsing to the one you already have.
   */
  const needle = value.trim().toLowerCase();
  const isExistingTitle = jobTitles.some((title) => title.toLowerCase() === needle);
  const matches = jobTitles.filter((title) => title.toLowerCase().includes(needle));
  const options = !needle || isExistingTitle ? jobTitles : matches.length > 0 ? matches : jobTitles;

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const pick = (title: string) => {
    onChange(title);
    onCommit?.(title);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative flex gap-2', className)} ref={wrapRef}>
      <Input
        value={value}
        autoFocus={autoFocus}
        placeholder="Job title"
        aria-label="Job title"
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onCommit?.(value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            setIsOpen(false);
            onSubmit?.();
          }
          if (event.key === 'ArrowDown' && jobTitles.length > 0) {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      />

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={jobTitles.length === 0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Choose a previous job title"
        title={jobTitles.length === 0 ? 'No previous job titles yet' : 'Previous job titles'}
        className={cn(
          'shrink-0 rounded-lg border border-line px-3 text-sm text-ink-muted transition',
          'hover:border-ink-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40',
          isOpen && 'border-accent text-accent',
        )}
      >
        <span aria-hidden className={cn('inline-block transition', isOpen && 'rotate-180')}>
          ▾
        </span>
      </button>

      {isOpen && options.length > 0 ? (
        <ul
          role="listbox"
          aria-label="Previous job titles"
          className="absolute top-full right-0 left-0 z-40 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-xl"
        >
          {options.map((title) => (
            <li key={title}>
              <button
                type="button"
                role="option"
                aria-selected={title.toLowerCase() === needle}
                onClick={() => pick(title)}
                className={cn(
                  'w-full truncate px-3 py-2 text-left text-sm transition hover:bg-surface-muted',
                  title.toLowerCase() === needle ? 'font-medium text-accent' : 'text-ink',
                )}
              >
                {title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
