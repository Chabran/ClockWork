export type { StorageAdapter } from './adapter';
export { LocalStorageAdapter } from './localStorageAdapter';
export { CURRENT_SCHEMA_VERSION, migrate } from './migrations';

import type { StorageAdapter } from './adapter';
import { LocalStorageAdapter } from './localStorageAdapter';

/**
 * Single place the concrete adapter is chosen.
 * Swap this line for `new SupabaseAdapter(client)` and the whole app follows.
 */
export function createStorageAdapter(): StorageAdapter {
  return new LocalStorageAdapter();
}
