import { z } from 'zod';

export const trackedApplicationStatusSchema = z.enum([
  'draft',
  'ready',
  'applied',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
]);

export const applicationRecordSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  jobFingerprint: z.string(),
  company: z.string(),
  role: z.string(),
  ats: z.enum(['greenhouse', 'generic']),
  status: trackedApplicationStatusSchema,
  score: z.number().int().min(0).max(100),
  appliedDate: z.string().nullable(),
  sourceUrl: z.string(),
  events: z.array(
    z.object({ id: z.string(), type: z.string(), occurredAt: z.string() }),
  ),
});

export type ApplicationRecord = z.infer<typeof applicationRecordSchema>;
