import type { PersistedState } from '@/lib/types';
import type { StorageAdapter } from './adapter';
import { CURRENT_SCHEMA_VERSION, migrate } from './migrations';

const STORAGE_KEY = 'freelance-timeclock:v1';

/**
 * Browser localStorage implementation of StorageAdapter.
 *
 * Notes:
 * - All methods are async even though localStorage is sync. That keeps the
 *   interface honest for network-backed adapters added later.
 * - `subscribe` uses the native `storage` event, which only fires in OTHER
 *   tabs. That is exactly what we want for cross-tab sync.
 */
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly key: string = STORAGE_KEY) {}

  async load(): Promise<PersistedState | null> {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      return migrate(JSON.parse(raw) as unknown);
    } catch (error) {
      console.error('[timeclock] corrupt store, starting fresh', error);
      return null;
    }
  }

  async save(state: PersistedState): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        this.key,
        JSON.stringify({ ...state, version: CURRENT_SCHEMA_VERSION }),
      );
    } catch (error) {
      // QuotaExceededError, Safari private mode, etc. Never crash the timer.
      console.error('[timeclock] save failed', error);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(this.key);
  }

  subscribe(onExternalChange: (state: PersistedState) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = (event: StorageEvent) => {
      if (event.key !== this.key || !event.newValue) return;
      try {
        onExternalChange(migrate(JSON.parse(event.newValue) as unknown));
      } catch {
        /* ignore malformed payloads from other tabs */
      }
    };

    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}
