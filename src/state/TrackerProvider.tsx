'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useTimeTracker, type UseTimeTracker } from '@/hooks/useTimeTracker';

const TrackerContext = createContext<UseTimeTracker | null>(null);

/**
 * Why a provider on top of the hook: `useTimeTracker` owns a timer, a storage
 * subscription and a debounced writer. Calling it in five components would
 * create five independent, competing copies. The provider guarantees exactly
 * one instance and lets any component read it.
 */
export function TrackerProvider({ children }: { children: ReactNode }) {
  const tracker = useTimeTracker();
  return <TrackerContext.Provider value={tracker}>{children}</TrackerContext.Provider>;
}

export function useTracker(): UseTimeTracker {
  const context = useContext(TrackerContext);
  if (!context) throw new Error('useTracker must be used inside <TrackerProvider>');
  return context;
}
