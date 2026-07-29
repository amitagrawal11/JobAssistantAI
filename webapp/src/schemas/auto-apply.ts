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

export const autoApplyPipelineStatusSchema = z.enum([
  'queued', 'running', 'paused', 'completed', 'completed_with_errors', 'cancelled',
]);

export const autoApplyPipelineSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  status: autoApplyPipelineStatusSchema,
  total_count: z.number(),
  completed_count: z.number(),
  failed_count: z.number(),
  created_at: z.string(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  items: z.array(autoApplyQueueItemSchema.extend({ position: z.number() })),
});

export const autoApplyPipelineListSchema = z.object({
  items: z.array(autoApplyPipelineSchema),
  total: z.number(),
});

export type AutoApplyPipeline = z.infer<typeof autoApplyPipelineSchema>;
export type AutoApplyPipelineList = z.infer<typeof autoApplyPipelineListSchema>;
