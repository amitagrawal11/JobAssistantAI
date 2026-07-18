import {
  documentParseSchema,
  documentUploadSchema,
  sourcePreviewSchema,
  type DocumentParse,
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

export function executeParse(operationId: string): Promise<DocumentParse> {
  return apiRequest(
    `/operations/${operationId}/execute`,
    documentParseSchema,
    { method: 'POST' },
    120_000,
  );
}

export function getSourcePreview(documentId: string): Promise<SourcePreview> {
  return apiRequest(
    `/documents/${documentId}/source-preview`,
    sourcePreviewSchema,
    {},
    30_000,
  );
}
