import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile, profileQueryKey } from '../../api/profiles';
import { deriveActiveProfileState } from './active-profile-state';

type ActiveIdentifiers = {
  profileId: string | null;
  documentId: string | null;
  storagePending: boolean;
};

const initialIdentifiers: ActiveIdentifiers = {
  profileId: null,
  documentId: null,
  storagePending: true,
};

export function useActiveBackendProfile() {
  const queryClient = useQueryClient();
  const [identifiers, setIdentifiers] = useState(initialIdentifiers);

  useEffect(() => {
    let mounted = true;
    void browser.storage.local
      .get(['activeProfileId', 'activeDocumentId'])
      .then((stored) => {
        if (!mounted) return;
        setIdentifiers({
          profileId:
            typeof stored.activeProfileId === 'string'
              ? stored.activeProfileId
              : null,
          documentId:
            typeof stored.activeDocumentId === 'string'
              ? stored.activeDocumentId
              : null,
          storagePending: false,
        });
      });
    const handleStorageChange = (
      changes: Record<string, Browser.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local') return;
      if (changes.activeProfileId || changes.activeDocumentId) {
        setIdentifiers((current) => ({
          profileId:
            typeof changes.activeProfileId?.newValue === 'string'
              ? changes.activeProfileId.newValue
              : changes.activeProfileId
                ? null
                : current.profileId,
          documentId:
            typeof changes.activeDocumentId?.newValue === 'string'
              ? changes.activeDocumentId.newValue
              : changes.activeDocumentId
                ? null
                : current.documentId,
          storagePending: false,
        }));
      }
      if (changes.activeProfileRevision) {
        void queryClient.invalidateQueries({ queryKey: ['profiles'] });
      }
    };
    browser.storage.onChanged.addListener(handleStorageChange);
    return () => {
      mounted = false;
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [queryClient]);

  const profileQuery = useQuery({
    queryKey: profileQueryKey(identifiers.profileId ?? 'inactive'),
    queryFn: () => getProfile(identifiers.profileId!),
    enabled: Boolean(identifiers.profileId),
  });
  const state = deriveActiveProfileState({
    profileId: identifiers.profileId,
    pending: identifiers.storagePending || profileQuery.isPending,
    profile: profileQuery.data,
    error: profileQuery.error,
  });
  return {
    ...identifiers,
    state,
    refetch: profileQuery.refetch,
  };
}
