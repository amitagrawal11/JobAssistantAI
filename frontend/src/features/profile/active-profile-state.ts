import type { BackendProfile } from '../../schemas/backend';

export type ActiveProfileState =
  | { status: 'missing'; scanUnlocked: false }
  | { status: 'loading'; scanUnlocked: false }
  | { status: 'error'; scanUnlocked: false; message: string }
  | { status: 'available'; scanUnlocked: boolean; profile: BackendProfile };

export function deriveActiveProfileState({
  profileId,
  pending,
  profile,
  error,
}: {
  profileId: string | null;
  pending: boolean;
  profile?: BackendProfile;
  error?: Error | null;
}): ActiveProfileState {
  if (!profileId) return { status: 'missing', scanUnlocked: false };
  if (pending) return { status: 'loading', scanUnlocked: false };
  if (error) {
    return { status: 'error', scanUnlocked: false, message: error.message };
  }
  if (!profile) {
    return {
      status: 'error',
      scanUnlocked: false,
      message: 'The active backend profile could not be loaded.',
    };
  }
  return {
    status: 'available',
    scanUnlocked: profile.readiness === 'ready',
    profile,
  };
}
