import { useSyncExternalStore } from 'react';

// Tracks which profiles are mid-extraction so the profile page can show
// shimmering skeletons instead of blocking the whole onboarding flow.
const parsing = new Set<string>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function markParsing(profileId: string): void {
  parsing.add(profileId);
  emit();
}

export function clearParsing(profileId: string): void {
  parsing.delete(profileId);
  emit();
}

export function useIsParsing(profileId: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => parsing.has(profileId),
  );
}
