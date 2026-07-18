import {
  backendProfileSchema,
  factVerificationRequestSchema,
  profileCreateSchema,
  profileUpdateSchema,
  type BackendProfile,
  type FactVerificationRequest,
  type ProfileCreate,
  type ProfileUpdate,
} from '../schemas/backend';
import { apiRequest } from './client';

export const profileQueryKey = (profileId: string) =>
  ['profiles', profileId] as const;

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
