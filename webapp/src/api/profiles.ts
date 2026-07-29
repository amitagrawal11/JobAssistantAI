import {
  backendProfileSchema,
  factVerificationRequestSchema,
  profileCreateSchema,
  profileDeleteSchema,
  profileUpdateSchema,
  type BackendProfile,
  type FactVerificationRequest,
  type ProfileCreate,
  type ProfileUpdate,
} from '../schemas/backend';
import { apiRequest } from './client';

export const profileQueryKey = (profileId: string) =>
  ['profiles', profileId] as const;

export function addProfileFact(
  profileId: string,
  input: { category: string; key: string; value: string },
): Promise<BackendProfile> {
  return apiRequest(`/profiles/${profileId}/facts`, backendProfileSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteProfileFact(profileId: string, factId: string): Promise<BackendProfile> {
  return apiRequest(`/profiles/${profileId}/facts/${factId}`, backendProfileSchema, {
    method: 'DELETE',
  });
}

export async function createProfile(input: ProfileCreate): Promise<BackendProfile> {
  const body = profileCreateSchema.parse(input);
  return apiRequest('/profiles', backendProfileSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getProfile(profileId: string): Promise<BackendProfile> {
  return apiRequest(`/profiles/${profileId}`, backendProfileSchema);
}

export function listProfiles(): Promise<BackendProfile[]> {
  return apiRequest('/profiles', backendProfileSchema.array());
}

export async function updateProfile(
  profileId: string,
  input: ProfileUpdate,
): Promise<BackendProfile> {
  const body = profileUpdateSchema.parse(input);
  return apiRequest(`/profiles/${profileId}`, backendProfileSchema, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function setDefaultProfile(profileId: string): Promise<BackendProfile> {
  return apiRequest(`/profiles/${profileId}/default`, backendProfileSchema, {
    method: 'POST',
  });
}

export function deleteProfile(profileId: string): Promise<{ deleted: boolean }> {
  return apiRequest(`/profiles/${profileId}`, profileDeleteSchema, {
    method: 'DELETE',
  });
}

export async function verifyProfileFacts(
  profileId: string,
  input: FactVerificationRequest,
): Promise<BackendProfile> {
  const body = factVerificationRequestSchema.parse(input);
  return apiRequest(`/profiles/${profileId}/facts/verify`, backendProfileSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
