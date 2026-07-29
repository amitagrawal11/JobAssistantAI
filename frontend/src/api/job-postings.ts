import { jobPostingListSchema, quickApplyResponseSchema, type JobPostingList, type QuickApplyResponse } from '../schemas/job-posting';
import { apiRequest } from './client';

export const jobPostingsQueryKey = (search: string, page: number, pageSize: number) =>
  ['job-postings', search, page, pageSize] as const;

export function listJobPostings(search: string, page: number, pageSize: number): Promise<JobPostingList> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search.trim()) params.set('search', search.trim());
  return apiRequest(`/job-postings?${params.toString()}`, jobPostingListSchema);
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
