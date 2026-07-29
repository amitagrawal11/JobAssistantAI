import { z } from 'zod';

export const jobPostingSchema = z.object({
  id: z.string(),
  vendor: z.string(),
  company: z.string(),
  title: z.string(),
  team: z.string().nullable(),
  location: z.string().nullable(),
  commitment: z.string().nullable(),
  hosted_url: z.string(),
  apply_url: z.string().nullable(),
  posted_at: z.string().nullable(),
  is_active: z.boolean(),
});

export const jobPostingListSchema = z.object({
  items: z.array(jobPostingSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export const quickApplyResponseSchema = z.object({
  status: z.string(),
});

export type JobPosting = z.infer<typeof jobPostingSchema>;
export type JobPostingList = z.infer<typeof jobPostingListSchema>;
export type QuickApplyResponse = z.infer<typeof quickApplyResponseSchema>;

export const QUICK_APPLY_VENDORS = new Set(["lever"]);
