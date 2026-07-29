import { z } from 'zod';
import { applicationRecordSchema } from './application';
import { applicationStatusSchema } from './common';
import { generatedDocumentsSchema } from './document';
import { fillPlanSchema } from './fill-plan';
import { jobSchema } from './job';
import { matchResultSchema } from './match';
import { candidateProfileSchema } from './profile';

export const sessionSchema = z.object({
  schemaVersion: z.literal(1),
  workflowStatus: applicationStatusSchema,
  profile: candidateProfileSchema,
  job: jobSchema,
  matchResult: matchResultSchema,
  documents: generatedDocumentsSchema,
  fillPlan: fillPlanSchema,
  applications: z.array(applicationRecordSchema),
});

export type PersistedSession = z.infer<typeof sessionSchema>;
