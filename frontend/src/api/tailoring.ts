import {
  documentChangeReviewResponseSchema,
  documentTailorResponseSchema,
  type DocumentTailorResponse,
} from '../schemas/tailoring';
import { apiRequest } from './client';

export function tailorDocuments(profileId: string, jobId: string): Promise<DocumentTailorResponse> {
  return apiRequest(
    '/documents/tailor',
    documentTailorResponseSchema,
    { method: 'POST', body: JSON.stringify({ profile_id: profileId, job_id: jobId }) },
    360_000,
  );
}

export function reviewDocumentChange(changeId: string, status: 'approved' | 'rejected') {
  return apiRequest(
    `/document-changes/${changeId}`,
    documentChangeReviewResponseSchema,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  );
}
