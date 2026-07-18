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
  ai_preferences: z.record(z.string(), z.string()),
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

export const documentUploadSchema = z.object({
  document_id: z.string().uuid(),
  operation_id: z.string().uuid(),
  filename: z.string(),
  media_type: z.string(),
  size_bytes: z.number().int().positive(),
  sha256: z.string().length(64),
  status: z.literal('pending'),
});

export const documentParseSchema = z.object({
  operation_id: z.string().uuid(),
  parse_run_id: z.string().uuid(),
  document_id: z.string().uuid(),
  status: z.literal('succeeded'),
});

export const sourcePreviewSchema = z.object({
  document_id: z.string().uuid(),
  filename: z.string(),
  media_kind: z.enum(['pdf', 'docx']),
  pages: z.array(
    z.object({
      number: z.number().int().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
      image_data_url: z.string().nullable(),
      html: z.string().nullable(),
    }),
  ),
  fact_regions: z.array(
    z.object({
      fact_id: z.string().uuid(),
      page_number: z.number().int().positive(),
      available: z.boolean(),
      normalized_box: z.array(z.number().min(0).max(1)).length(4).nullable(),
      reason: z.string().nullable(),
    }),
  ),
});

export const providerInfoSchema = z.object({
  id: z.enum(['ollama', 'openai']),
  label: z.string(),
  available: z.boolean(),
  models: z.array(z.string()),
  selected_model: z.string().nullable(),
  status: z.enum(['available', 'not_configured', 'unavailable', 'no_models']),
});
export const providerListSchema = z.object({ providers: z.array(providerInfoSchema) });
export const providerTestSchema = z.object({
  provider: z.enum(['ollama', 'openai']), model: z.string(), ok: z.boolean(), message: z.string(),
});
export const aiPreferenceSchema = z.object({ provider: z.enum(['ollama', 'openai']), model: z.string() });

export type BackendProfile = z.infer<typeof backendProfileSchema>;
export type ProfileCreate = z.infer<typeof profileCreateSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type FactVerificationRequest = z.infer<
  typeof factVerificationRequestSchema
>;
export type DocumentUpload = z.infer<typeof documentUploadSchema>;
export type DocumentParse = z.infer<typeof documentParseSchema>;
export type SourcePreview = z.infer<typeof sourcePreviewSchema>;
export type ProviderInfo = z.infer<typeof providerInfoSchema>;
export type AiPreference = z.infer<typeof aiPreferenceSchema>;
