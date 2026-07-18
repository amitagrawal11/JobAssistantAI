import type { BackendProfile } from '../../schemas/backend';

export function deriveProfileSelectionState(
  profiles: BackendProfile[],
  activeProfileId: string | null,
) {
  const selectedProfile = activeProfileId
    ? profiles.find((profile) => profile.id === activeProfileId) ?? null
    : null;
  return {
    selectedProfile,
    scanUnlocked: selectedProfile?.readiness === 'ready',
  };
}

export async function selectActiveProfile(profile: BackendProfile): Promise<void> {
  const stored = await browser.storage.local.get('activeProfileId');
  if (stored.activeProfileId === profile.id) return;
  await browser.storage.local.remove([
    'activeDocumentId',
    'activeJobAnalysis',
    'activeBackendMatch',
  ]);
  const documentId = profile.facts[0]?.source.document_id;
  await browser.storage.local.set({
    activeProfileId: profile.id,
    ...(documentId ? { activeDocumentId: documentId } : {}),
    activeProfileRevision: Date.now(),
  });
}
