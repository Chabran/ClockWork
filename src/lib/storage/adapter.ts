import type { PersistedState } from '@/lib/types';

/**
 * The only contract the app knows about persistence.
 *
 * Every read/write in the app goes through this interface, so moving from
 * localStorage to IndexedDB or Supabase means writing one new class — no
 * component or hook changes. This is the Ports & Adapters (hexagonal) pattern:
 * the domain owns the port, infrastructure supplies the adapter.
 */
export interface StorageAdapter {
  /** Returns null when nothing has been saved yet (first run). */
  load(): Promise<PersistedState | null>;
  save(state: PersistedState): Promise<void>;
  clear(): Promise<void>;
  /**
   * Notifies when another tab/device mutates the same store.
   * Returns an unsubscribe function. No-op adapters may ignore this.
   */
  subscribe(onExternalChange: (state: PersistedState) => void): () => void;
}
