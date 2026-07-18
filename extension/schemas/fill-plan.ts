import { z } from 'zod';

export const fieldConfidenceSchema = z.enum(['high', 'medium', 'low', 'unknown']);
export const fieldSensitivitySchema = z.enum([
  'none',
  'work_authorization',
  'demographic',
  'legal',
]);
export const fillEntryStatusSchema = z.enum([
  'proposed',
  'needs_review',
  'needs_user_input',
  'approved',
  'filled',
  'skipped',
  'failed',
  'changed_since_scan',
]);

export const fillPlanEntrySchema = z.object({
  fieldId: z.string(),
  label: z.string(),
  type: z.string(),
  required: z.boolean(),
  proposedValue: z.string().nullable(),
  sourceFactIds: z.array(z.string()),
  confidence: fieldConfidenceSchema,
  sensitivity: fieldSensitivitySchema,
  requiresReview: z.boolean(),
  selected: z.boolean(),
  status: fillEntryStatusSchema,
});

export const fillPlanSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  schemaVersion: z.literal(1),
  status: z.enum(['proposed', 'approved', 'executed']),
  approvedAt: z.string().nullable(),
  entries: z.array(fillPlanEntrySchema),
});

export type FillPlan = z.infer<typeof fillPlanSchema>;
