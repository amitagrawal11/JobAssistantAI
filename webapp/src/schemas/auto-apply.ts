import { z } from 'zod';

export const autoApplyStatusSchema = z.enum([
  'queued', 'awaiting_approval', 'tailoring', 'submitted', 'skipped',
]);
export type AutoApplyStatus = z.infer<typeof autoApplyStatusSchema>;

export const autoApplyQueueItemSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  job_posting_id: z.string().nullable(),
  role: z.string(),
  company: z.string(),
  location: z.string().nullable(),
  match_score: z.number().nullable(),
  status: autoApplyStatusSchema,
  note: z.string().nullable(),
  created_at: z.string(),
});

export const autoApplyQueueStatsSchema = z.object({
  in_queue: z.number(),
  applied_today: z.number(),
  awaiting_approval: z.number(),
  avg_match: z.number(),
});

export const autoApplyQueueListSchema = z.object({
  items: z.array(autoApplyQueueItemSchema),
  total: z.number(),
  stats: autoApplyQueueStatsSchema,
});

export type AutoApplyQueueItem = z.infer<typeof autoApplyQueueItemSchema>;
export type AutoApplyQueueList = z.infer<typeof autoApplyQueueListSchema>;
