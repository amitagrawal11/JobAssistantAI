import { z } from 'zod';

export const tailoredClassificationSchema = z.enum([
  'REPHRASED',
  'REORDERED',
  'EMPHASIZED',
  'REMOVED',
  'NEW_CLAIM',
]);

export const tailoredChangeSchema = z.object({
  id: z.string(),
  section: z.string(),
  operation: z.enum(['rewrite', 'reorder', 'emphasize', 'remove']),
  before: z.string(),
  after: z.string(),
  sourceFactIds: z.array(z.string()),
  classification: tailoredClassificationSchema,
  reason: z.string(),
  status: z.enum(['pending_review', 'accepted', 'rejected']),
});

export const generatedDocumentsSchema = z.object({
  resume: z.object({
    id: z.string(),
    title: z.string(),
    pageCount: z.number().int().positive(),
    changes: z.array(tailoredChangeSchema),
    sections: z.array(z.object({ title: z.string(), content: z.array(z.string()) })),
  }),
  coverLetter: z.object({
    id: z.string(),
    status: z.enum(['drafted', 'approved']),
    wordCount: z.number().int().nonnegative(),
    paragraphs: z.array(z.string()),
    sourceFactIds: z.array(z.string()),
  }),
});

export type GeneratedDocuments = z.infer<typeof generatedDocumentsSchema>;
