import type { BackendProfile } from '../schemas/backend';
import { deriveActiveProfileState } from '../features/profile/active-profile-state';
import { deriveProfileSelectionState } from '../features/profile/profile-selection';

const baseProfile: BackendProfile = {
  id: '00000000-0000-4000-8000-000000000001',
  display_name: 'Amit Agrawal',
  email: 'amit@example.test',
  readiness: 'needs_review',
  source_comparison_resolved: false,
  ai_preferences: {},
  facts: [],
  created_at: '2026-07-19T00:00:00Z',
  updated_at: '2026-07-19T00:00:00Z',
};

const missing = deriveActiveProfileState({ profileId: null, pending: false });
if (missing.status !== 'missing' || missing.scanUnlocked) {
  throw new Error('Missing profile incorrectly unlocked Scan');
}

const loading = deriveActiveProfileState({
  profileId: baseProfile.id,
  pending: true,
});
if (loading.status !== 'loading' || loading.scanUnlocked) {
  throw new Error('Loading profile incorrectly unlocked Scan');
}

const failed = deriveActiveProfileState({
  profileId: baseProfile.id,
  pending: false,
  error: new Error('Backend unavailable'),
});
if (failed.status !== 'error' || failed.scanUnlocked) {
  throw new Error('Backend failure incorrectly unlocked Scan');
}

const reviewing = deriveActiveProfileState({
  profileId: baseProfile.id,
  pending: false,
  profile: baseProfile,
});
if (reviewing.status !== 'available' || reviewing.scanUnlocked) {
  throw new Error('Incomplete profile incorrectly unlocked Scan');
}

const ready = deriveActiveProfileState({
  profileId: baseProfile.id,
  pending: false,
  profile: { ...baseProfile, readiness: 'ready', source_comparison_resolved: true },
});
if (ready.status !== 'available' || !ready.scanUnlocked) {
  throw new Error('Ready backend profile did not unlock Scan');
}

const readyProfile = { ...baseProfile, readiness: 'ready' as const };
const noSelection = deriveProfileSelectionState([baseProfile, readyProfile], null);
if (noSelection.selectedProfile !== null || noSelection.scanUnlocked) {
  throw new Error('Profiles unlocked Scan without an explicit selection');
}
const missingSelection = deriveProfileSelectionState(
  [baseProfile],
  '00000000-0000-4000-8000-000000000099',
);
if (missingSelection.selectedProfile !== null || missingSelection.scanUnlocked) {
  throw new Error('An absent profile selection unlocked Scan');
}
const selectedReady = deriveProfileSelectionState([readyProfile], readyProfile.id);
if (selectedReady.selectedProfile?.id !== readyProfile.id || !selectedReady.scanUnlocked) {
  throw new Error('Explicit ready profile selection did not unlock Scan');
}

console.log('Validated authoritative backend profile state');
