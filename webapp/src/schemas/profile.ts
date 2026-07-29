import { z } from 'zod';

export const candidateFactSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  value: z.string(),
  source: z
    .object({
      documentId: z.string(),
      page: z.number().int().positive(),
      bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
      elementIds: z.array(z.string()),
    })
    .optional(),
  confidence: z.number().min(0).max(1),
  verified: z.boolean(),
});

export const candidateProfileSchema = z.object({
  id: z.string(),
  personal: z.object({
    fullName: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    links: z.array(z.string()),
  }),
  summary: z.string(),
  skills: z.array(z.string()),
  facts: z.array(candidateFactSchema),
  verification: z.object({
    status: z.enum(['unverified', 'in_review', 'ready']),
    verifiedFactIds: z.array(z.string()),
  }),
  reusableAnswers: z.record(z.string(), z.string()),
});

export type CandidateFact = z.infer<typeof candidateFactSchema>;
export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
