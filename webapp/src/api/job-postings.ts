import {
  candidateJobStateSchema, jobPostingFacetResponseSchema, jobPostingListSchema,
  quickApplyResponseSchema, type CandidateJobState, type JobPostingFacetResponse,
  type JobPostingList, type QuickApplyResponse,
} from '../schemas/job-posting';
import type { JobFilterState } from '../features/job-filters/job-filter-state';
import { serializeJobFilterSearch } from '../features/job-filters/job-filter-state';
import { apiRequest } from './client';

export const jobPostingsQueryKey = (filters: JobFilterState, pageSize: number) =>
  ['job-postings', serializeJobFilterSearch(filters), pageSize] as const;

export const jobPostingFacetsQueryKey = (filters: JobFilterState) =>
  ['job-posting-facets', serializeJobFilterSearch({ ...filters, page: 1 })] as const;

export function buildJobPostingParams(filters: JobFilterState, pageSize: number): URLSearchParams {
  const params = new URLSearchParams(serializeJobFilterSearch(filters));
  params.set('page', String(filters.page));
  params.set('page_size', String(pageSize));
  for (const handled of filters.handled) params.set(handled, 'true');
  params.delete('handled');
  return params;
}

export function listJobPostings(filters: JobFilterState, pageSize: number): Promise<JobPostingList> {
  return apiRequest(`/job-postings?${buildJobPostingParams(filters, pageSize)}`, jobPostingListSchema);
}

export function listJobPostingFacets(filters: JobFilterState): Promise<JobPostingFacetResponse> {
  const params = buildJobPostingParams({ ...filters, page: 1 }, 100);
  params.delete('page');
  params.delete('page_size');
  return apiRequest(`/job-postings/facets?${params}`, jobPostingFacetResponseSchema);
}

export function updateCandidateJobState(
  jobPostingId: string, profileId: string, payload: { saved?: boolean; dismissed?: boolean },
): Promise<CandidateJobState> {
  return apiRequest(
    `/job-postings/${jobPostingId}/state?profile_id=${encodeURIComponent(profileId)}`,
    candidateJobStateSchema,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export function quickApplyToJobPosting(
  jobPostingId: string,
  payload: { profile_id: string; phone?: string; comments?: string },
): Promise<QuickApplyResponse> {
  return apiRequest(`/job-postings/${jobPostingId}/quick-apply`, quickApplyResponseSchema, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
