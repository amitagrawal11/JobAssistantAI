import {
  documentReprocessSchema,
  documentUploadSchema,
  sourcePreviewSchema,
  type DocumentUpload,
  type SourcePreview,
} from '../schemas/backend';
import { apiRequest } from './client';

export const sourcePreviewQueryKey = (documentId: string) =>
  ['documents', documentId, 'source-preview'] as const;

export async function uploadDocument(
  profileId: string,
  file: File,
): Promise<DocumentUpload> {
  const form = new FormData();
  form.set('document', file, file.name);
  return apiRequest(
    `/profiles/${profileId}/documents`,
    documentUploadSchema,
    { method: 'POST', body: form },
    30_000,
  );
}

export function reprocessDocument(documentId: string) {
  return apiRequest(`/documents/${documentId}/reprocess`, documentReprocessSchema, { method: 'POST' }, 30_000);
}

export function getSourcePreview(documentId: string): Promise<SourcePreview> {
  return apiRequest(
    `/documents/${documentId}/source-preview`,
    sourcePreviewSchema,
    {},
    30_000,
  );
}
