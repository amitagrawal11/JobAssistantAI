import { useSyncExternalStore } from 'react';
import { browser } from './browser-storage';

const KEY = 'activeProfileId';

let cache: string | null | undefined;

async function refreshCache(): Promise<void> {
  const stored = await browser.storage.local.get(KEY);
  cache = typeof stored[KEY] === 'string' ? (stored[KEY] as string) : null;
}

// Kick off an initial read so the first render has a value soon.
void refreshCache();

export async function setActiveProfileId(profileId: string): Promise<void> {
  cache = profileId;
  await browser.storage.local.set({ [KEY]: profileId });
}

export async function clearActiveProfileId(): Promise<void> {
  cache = null;
  await browser.storage.local.remove(KEY);
}

function subscribe(callback: () => void): () => void {
  const listener = (changes: Record<string, { newValue?: unknown }>) => {
    if (KEY in changes) {
      cache =
        typeof changes[KEY].newValue === 'string'
          ? (changes[KEY].newValue as string)
          : null;
      callback();
    }
  };
  browser.storage.onChanged.addListener(listener);
  // Ensure cache is populated then notify.
  void refreshCache().then(callback);
  return () => browser.storage.onChanged.removeListener(listener);
}

function getSnapshot(): string | null | undefined {
  return cache;
}

/**
 * Reactive active-profile id.
 * `undefined` = still loading from storage; `null` = no profile yet; string = id.
 */
export function useActiveProfileId(): string | null | undefined {
  return useSyncExternalStore(subscribe, getSnapshot);
}
