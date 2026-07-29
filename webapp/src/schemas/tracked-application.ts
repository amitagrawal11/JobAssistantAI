import { z } from 'zod';

export const applicationOutcomeSchema = z.enum(['applied', 'interview', 'offer', 'rejected']);
export type ApplicationOutcome = z.infer<typeof applicationOutcomeSchema>;

export const trackedApplicationSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  job_posting_id: z.string().nullable(),
  role: z.string(),
  company: z.string(),
  location: z.string().nullable(),
  match_score: z.number().nullable(),
  status: applicationOutcomeSchema,
  source: z.string(),
  applied_at: z.string(),
});

export const trackedApplicationListSchema = z.object({
  items: z.array(trackedApplicationSchema),
  total: z.number(),
  counts: z.record(z.string(), z.number()),
});

export type TrackedApplication = z.infer<typeof trackedApplicationSchema>;
export type TrackedApplicationList = z.infer<typeof trackedApplicationListSchema>;
