import type { BackendProfile } from '../../schemas/backend';

import { isProfileSelectable } from '../profile-processing/profile-processing';

export type HeaderProfile = Pick<
  BackendProfile,
  'id' | 'display_name' | 'is_default' | 'readiness' | 'processing'
>;

export function resolveHeaderProfile(
  profiles: HeaderProfile[],
  activeProfileId: string | null | undefined,
): { selected: HeaderProfile | null; shouldPersist: boolean } {
  const selectable = profiles.filter(isProfileSelectable);
  if (selectable.length === 0) return { selected: null, shouldPersist: false };
  if (selectable.length === 1) {
    return {
      selected: selectable[0],
      shouldPersist: activeProfileId !== selectable[0].id,
    };
  }
  const active = selectable.find((profile) => profile.id === activeProfileId);
  if (active) return { selected: active, shouldPersist: false };
  const fallback = selectable.find((profile) => profile.is_default) ?? null;
  return {
    selected: fallback,
    shouldPersist: Boolean(fallback && fallback.id !== activeProfileId),
  };
}
