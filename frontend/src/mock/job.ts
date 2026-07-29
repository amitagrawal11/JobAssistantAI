import { jobSchema } from '../schemas/job';

const coreFields = [
  ['first_name', 'First name', 'text'], ['last_name', 'Last name', 'text'],
  ['email', 'Email', 'email'], ['phone', 'Phone', 'tel'],
  ['location', 'Location', 'text'], ['linkedin', 'LinkedIn URL', 'url'],
  ['portfolio', 'Portfolio', 'url'], ['resume', 'Resume', 'file'],
  ['cover', 'Cover letter', 'file'], ['salary', 'Salary expectation', 'text'],
  ['notice', 'Notice period', 'text'], ['authorization', 'Work authorization', 'select'],
  ['sponsorship', 'Sponsorship required', 'select'], ['demographic', 'Demographic questions', 'select'],
  ['additional', 'Additional information', 'textarea'],
] as const;

export const mockJob = jobSchema.parse({
  id: 'job_001',
  jobFingerprint: 'sha256:northstar-labs-senior-frontend-engineer-austin',
  canonicalUrl: 'https://boards.example.test/northstar/jobs/123',
  sourceUrl: 'https://boards.example.test/northstar/jobs/123',
  ats: 'greenhouse',
  title: 'Senior Frontend Engineer',
  company: 'Northstar Labs',
  location: 'Austin, TX · Hybrid',
  description: 'Lead React and TypeScript product development, evolve a shared design system, mentor engineers, and partner with product teams. Accessibility experience is required; GraphQL and fintech experience are preferred.',
  applicationFields: coreFields.map(([id, label, type]) => ({ id, label, type, required: !['portfolio', 'demographic', 'additional'].includes(id), options: type === 'select' ? ['Yes', 'No', 'Prefer not to say'] : [] })),
});
