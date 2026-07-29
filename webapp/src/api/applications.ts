import {
  trackedApplicationListSchema,
  trackedApplicationSchema,
  type ApplicationOutcome,
  type TrackedApplication,
  type TrackedApplicationList,
} from '../schemas/tracked-application';
import { apiRequest } from './client';

export const applicationsQueryKey = (profileId: string, status: string) =>
  ['applications', profileId, status] as const;

export function listApplications(profileId: string, status?: string): Promise<TrackedApplicationList> {
  const params = new URLSearchParams({ profile_id: profileId });
  if (status && status !== 'All') params.set('status', status.toLowerCase());
  return apiRequest(`/applications?${params.toString()}`, trackedApplicationListSchema);
}

export type CreateApplicationInput = {
  profile_id: string;
  job_posting_id?: string;
  role: string;
  company: string;
  location?: string | null;
  match_score?: number | null;
  source?: string;
};

export function createApplication(input: CreateApplicationInput): Promise<TrackedApplication> {
  return apiRequest(`/applications`, trackedApplicationSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateApplicationStatus(id: string, status: ApplicationOutcome): Promise<TrackedApplication> {
  return apiRequest(`/applications/${id}`, trackedApplicationSchema, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
