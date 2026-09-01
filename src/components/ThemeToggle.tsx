'use client';

import { useEffect } from 'react';
import { useTracker } from '@/state/TrackerProvider';
import { Button } from '@/components/ui/primitives';

const ORDER = ['system', 'light', 'dark'] as const;
const LABEL = { system: '◐ System', light: '☀ Light', dark: '☾ Dark' } as const;

/**
 * Theme is app state, so it lives in the same persisted store as everything
 * else. This component's only job is projecting that state onto <html>, because
 * the `.dark` class must sit above the React root for CSS variables to cascade.
 */
export function ThemeToggle() {
  const { settings, updateSettings } = useTracker();
  const theme = settings.theme;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', isDark);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  return (
    <Button
      onClick={() => updateSettings({ theme: ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length] })}
      className="px-3 py-1.5 text-xs"
      aria-label={`Theme: ${theme}. Click to change.`}
    >
      {LABEL[theme]}
    </Button>
  );
}
