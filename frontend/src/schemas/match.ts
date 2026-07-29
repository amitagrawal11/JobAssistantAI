import { z } from 'zod';
import { matchClassificationSchema } from './common';

export const matchItemSchema = z.object({
  id: z.string(),
  requirement: z.string(),
  classification: matchClassificationSchema,
  sourceFactIds: z.array(z.string()),
  scoreContribution: z.number().min(0),
  reason: z.string(),
  hardGate: z.boolean().default(false),
});

export const matchResultSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  profileId: z.string(),
  score: z.number().int().min(0).max(100),
  scoringVersion: z.literal('phase-1-mock'),
  summary: z.string(),
  items: z.array(matchItemSchema),
});

export type MatchResult = z.infer<typeof matchResultSchema>;
