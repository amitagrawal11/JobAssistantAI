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
  supported: z.boolean(),
});

export const resumeItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  source_fact_ids: z.array(z.string()),
});

export const resumeSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(resumeItemSchema),
});

export const canonicalResumeSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
  contact: z.record(z.string(), z.string()),
  sections: z.array(resumeSectionSchema),
  template_id: z.string(),
  page_size: z.string(),
});

export const resumeDocumentSchema = z.object({
  id: z.string(),
  status: z.string(),
  changes: z.array(documentChangeSchema),
  source: canonicalResumeSchema,
  current: canonicalResumeSchema,
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

export const generatedResumeSchema = z.object({
  id: z.string(),
  job_id: z.string(),
  title: z.string(),
  company: z.string().nullable(),
  source_url: z.string().nullable(),
  source: canonicalResumeSchema,
  current: canonicalResumeSchema,
  changes: z.array(documentChangeSchema),
});

export type DocumentChange = z.infer<typeof documentChangeSchema>;
export type DocumentTailorResponse = z.infer<typeof documentTailorResponseSchema>;
export type CanonicalResume = z.infer<typeof canonicalResumeSchema>;
export type GeneratedResume = z.infer<typeof generatedResumeSchema>;
