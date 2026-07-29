import { z } from 'zod';
import { trackedApplicationSchema } from './tracked-application';

export const overviewSchema = z.object({
  stats: z.object({
    applications_sent: z.number(),
    avg_match: z.number(),
    interviews: z.number(),
    offers: z.number(),
  }),
  over_time: z.array(z.object({ label: z.string(), count: z.number() })),
  outcomes: z.array(z.object({ status: z.string(), count: z.number() })),
  top_matches: z.array(z.object({
    job_posting_id: z.string(),
    role: z.string(),
    company: z.string(),
    location: z.string().nullable(),
    match_score: z.number(),
  })),
  recently_applied: z.array(trackedApplicationSchema),
});

export type Overview = z.infer<typeof overviewSchema>;
