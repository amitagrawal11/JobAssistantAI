import { z } from 'zod';

export const confidenceSchema = z.enum(['high', 'medium', 'low']);
export const matchClassificationSchema = z.enum([
  'matched',
  'partial',
  'missing',
  'unknown',
]);
export const applicationStatusSchema = z.enum([
  'idle',
  'job_detected',
  'analyzing',
  'scored',
  'tailoring',
  'reviewing',
  'ready_to_fill',
  'filling',
  'awaiting_submission',
  'completed',
  'failed',
]);

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
