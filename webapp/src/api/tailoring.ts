import {
  documentChangeReviewResponseSchema,
  documentTailorResponseSchema,
  generatedResumeSchema,
  type DocumentTailorResponse,
} from '../schemas/tailoring';
import { apiDownload, apiRequest } from './client';

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

export function getGeneratedResume(documentId: string) {
  return apiRequest(`/generated-documents/${documentId}`, generatedResumeSchema);
}

export async function downloadGeneratedResume(documentId: string) {
  const { blob, filename } = await apiDownload(`/generated-documents/${documentId}/pdf`, 180_000);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
