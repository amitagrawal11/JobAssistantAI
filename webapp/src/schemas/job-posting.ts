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
  workplace_type: z.string().default('unknown'),
  employment_type: z.string().default('unknown'),
  role_category: z.string().default('other'),
  experience_level: z.string().default('unknown'),
  max_experience: z.string().default('unknown'),
  degree_level: z.string().default('none_mentioned'),
  sponsorship: z.string().default('unknown'),
  salary_min: z.number().nullable().default(null),
  salary_max: z.number().nullable().default(null),
  salary_currency: z.string().nullable().default(null),
  salary_period: z.string().nullable().default(null),
  skills: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  industry: z.string().default('unknown'),
  travel: z.string().default('unknown'),
  enrichment_evidence: z.array(z.record(z.string(), z.unknown())).default([]),
  saved: z.boolean().default(false),
  dismissed: z.boolean().default(false),
  match_score: z.number().nullable().default(null),
  match_level: z.string().nullable().default(null),
  missing_critical_skills: z.number().nullable().default(null),
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

export const facetOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  count: z.number(),
});

export const jobPostingFacetResponseSchema = z.object({
  facets: z.record(z.string(), z.array(facetOptionSchema)),
});

export const candidateJobStateSchema = z.object({
  job_posting_id: z.string(),
  profile_id: z.string(),
  saved: z.boolean(),
  dismissed: z.boolean(),
});

export type JobPosting = z.infer<typeof jobPostingSchema>;
export type JobPostingList = z.infer<typeof jobPostingListSchema>;
export type QuickApplyResponse = z.infer<typeof quickApplyResponseSchema>;
export type JobPostingFacetResponse = z.infer<typeof jobPostingFacetResponseSchema>;
export type CandidateJobState = z.infer<typeof candidateJobStateSchema>;

export const QUICK_APPLY_VENDORS = new Set(["lever"]);
