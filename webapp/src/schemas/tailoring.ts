import { z } from 'zod';

export const documentChangeSchema = z.object({
  id: z.string(),
  section: z.string(),
  operation: z.enum(['rewrite', 'reorder', 'emphasize', 'remove']),
  before: z.string(),
  after: z.string(),
  classification: z.enum(['REPHRASED', 'REORDERED', 'EMPHASIZED', 'REMOVED', 'NEW_CLAIM']),
  reason: z.string(),
  source_fact_ids: z.array(z.string()),
  status: z.enum(['proposed', 'approved', 'rejected']),
});

export const resumeDocumentSchema = z.object({
  id: z.string(),
  status: z.string(),
  changes: z.array(documentChangeSchema),
});

export const coverLetterDocumentSchema = z.object({
  id: z.string(),
  status: z.string(),
  paragraphs: z.array(z.string()),
  source_fact_ids: z.array(z.string()),
});

export const documentTailorResponseSchema = z.object({
  operation_id: z.string(),
  profile_id: z.string(),
  job_id: z.string(),
  resume: resumeDocumentSchema,
  cover_letter: coverLetterDocumentSchema,
  provider: z.string(),
  model: z.string(),
  prompt_version: z.string(),
});

export const documentChangeReviewResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['proposed', 'approved', 'rejected']),
});

export type DocumentChange = z.infer<typeof documentChangeSchema>;
export type DocumentTailorResponse = z.infer<typeof documentTailorResponseSchema>;
