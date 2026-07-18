import { z } from 'zod';

export const backendErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    details: z.record(z.string(), z.unknown()),
  }),
});

export const sourceReferenceSchema = z.object({
  document_id: z.string().uuid(),
  page: z.number().int().positive().nullable(),
  bounding_box: z.array(z.number()),
  element_ids: z.array(z.string()),
});

export const backendCandidateFactSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  key: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(1).nullable(),
  verified: z.boolean(),
  correction_version: z.number().int().nonnegative(),
  source: sourceReferenceSchema,
});

export const backendProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  email: z.string().nullable(),
  readiness: z.enum(['uploaded', 'needs_review', 'ready', 'parse_failed']),
  source_comparison_resolved: z.boolean(),
  facts: z.array(backendCandidateFactSchema),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export const profileCreateSchema = z.object({
  display_name: z.string().min(1).max(200),
  email: z.string().max(320).nullable().optional(),
});

export const profileUpdateSchema = profileCreateSchema.partial();

export const factVerificationRequestSchema = z.object({
  facts: z
    .array(
      z.object({
        fact_id: z.string().uuid(),
        value: z.string().optional(),
        verified: z.boolean(),
      }),
    )
    .min(1),
  source_comparison_resolved: z.boolean().optional(),
});

export type BackendProfile = z.infer<typeof backendProfileSchema>;
export type ProfileCreate = z.infer<typeof profileCreateSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type FactVerificationRequest = z.infer<
  typeof factVerificationRequestSchema
>;
