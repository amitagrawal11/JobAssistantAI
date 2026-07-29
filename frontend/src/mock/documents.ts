import { generatedDocumentsSchema } from '../schemas/document';

export const mockDocuments = generatedDocumentsSchema.parse({
  resume: {
    id: 'resume_001', title: 'Jordan Lee · Senior Frontend Engineer', pageCount: 2,
    changes: [
      { id: 'change_1', section: 'Skills', operation: 'reorder', before: 'Node.js · React · Accessibility · TypeScript', after: 'React · TypeScript · Accessibility · Node.js', sourceFactIds: ['fact_react', 'fact_accessibility'], classification: 'REORDERED', reason: 'Lead with verified skills named in the job.', status: 'accepted' },
      { id: 'change_2', section: 'Experience', operation: 'rewrite', before: 'Managed a frontend team.', after: 'Led a frontend platform group of 12 engineers.', sourceFactIds: ['fact_leadership'], classification: 'REPHRASED', reason: 'Use the verified scope to clarify leadership relevance.', status: 'pending_review' },
      { id: 'change_3', section: 'Experience', operation: 'emphasize', before: 'Added accessibility checks.', after: 'Introduced WCAG-focused release checks across three products.', sourceFactIds: ['fact_accessibility'], classification: 'EMPHASIZED', reason: 'Make verified accessibility evidence easier to find.', status: 'rejected' },
    ],
    sections: [
      { title: 'Summary', content: ['Frontend engineering leader focused on accessible product platforms.'] },
      { title: 'Experience', content: ['Led a frontend platform group of 12 engineers.', 'Introduced WCAG-focused release checks across three products.'] },
      { title: 'Skills', content: ['React · TypeScript · Accessibility · Node.js'] },
    ],
  },
  coverLetter: {
    id: 'cover_001', status: 'drafted', wordCount: 182,
    paragraphs: ['Dear Northstar Labs team,', 'My verified experience leading frontend platforms and introducing accessibility release checks aligns closely with this role.', 'I would welcome the opportunity to discuss how that experience could support Northstar Labs.'],
    sourceFactIds: ['fact_leadership', 'fact_accessibility'],
  },
});
