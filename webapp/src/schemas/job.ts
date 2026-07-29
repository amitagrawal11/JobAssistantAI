import { z } from 'zod';

export const fieldDescriptorSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['text', 'email', 'tel', 'url', 'textarea', 'select', 'file']),
  required: z.boolean(),
  options: z.array(z.string()).default([]),
});

export const jobSchema = z.object({
  id: z.string(),
  jobFingerprint: z.string(),
  canonicalUrl: z.string(),
  sourceUrl: z.string(),
  ats: z.enum(['greenhouse', 'generic']),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  description: z.string(),
  applicationFields: z.array(fieldDescriptorSchema),
});

export type Job = z.infer<typeof jobSchema>;
