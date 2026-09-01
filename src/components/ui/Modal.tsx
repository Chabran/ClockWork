'use client';

import { useEffect, type ReactNode } from 'react';

/**
 * Minimal accessible modal: Escape closes it, background scroll is locked, and
 * the backdrop click target is a real button so keyboard users are not trapped.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-lg rounded-t-2xl border border-line bg-surface p-5 shadow-xl sm:rounded-2xl"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            Esc
          </button>
        </header>
        <div className="space-y-4">{children}</div>
        {footer ? <footer className="mt-6 flex justify-end gap-2">{footer}</footer> : null}
      </div>
    </div>
  );
}
