import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProviders, providersQueryKey, saveAiPreference } from '../../api/ai';
import { profileQueryKey } from '../../api/profiles';
import { useActiveBackendProfile } from '../profile/use-active-backend-profile';
import { deriveAiDefault, formatDefaultNotice, isPreferenceValid } from './ai-default';
import { browser } from '../../lib/browser-storage';

export function useEnsureAiDefault(): { notice: string | null; dismiss: () => void } {
  const active = useActiveBackendProfile();
  const queryClient = useQueryClient();
  const providers = useQuery({ queryKey: providersQueryKey, queryFn: getProviders });
  const [notice, setNotice] = useState<string | null>(null);
  const attempted = useRef<Set<string>>(new Set());

  const profileId = active.profileId;
  const backendProfile = active.state.status === 'available' ? active.state.profile : null;
  const providerList = providers.data?.providers ?? null;

  useEffect(() => {
    if (!profileId || !backendProfile || !providerList) return;
    if (attempted.current.has(profileId)) return;
    if (isPreferenceValid(providerList, backendProfile.ai_preferences)) return;
    const preference = deriveAiDefault(providerList);
    if (!preference) return;
    attempted.current.add(profileId);
    void saveAiPreference(profileId, preference)
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: profileQueryKey(profileId) });
        await browser.storage.local.set({ activeProfileRevision: Date.now() });
        setNotice(formatDefaultNotice(preference));
      })
      .catch((error) => {
        console.warn('Failed to auto-select AI default', error);
      });
  }, [profileId, backendProfile, providerList, queryClient]);

  return { notice, dismiss: () => setNotice(null) };
}
