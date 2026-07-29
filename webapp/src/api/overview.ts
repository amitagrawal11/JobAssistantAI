import { overviewSchema, type Overview } from '../schemas/overview';
import { apiRequest } from './client';

export const overviewQueryKey = (profileId: string) => ['overview', profileId] as const;

export function getOverview(profileId: string): Promise<Overview> {
  return apiRequest(`/overview?profile_id=${encodeURIComponent(profileId)}`, overviewSchema);
}
