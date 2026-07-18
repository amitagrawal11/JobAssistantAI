import { applicationRecordSchema } from '../schemas/application';

const statuses = ['draft', 'ready', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'] as const;
export const mockApplications = statuses.map((status, index) => applicationRecordSchema.parse({
  id: `application_00${index + 1}`,
  jobId: index === 0 ? 'job_001' : `job_00${index + 1}`,
  jobFingerprint: index === 0 ? 'sha256:northstar-labs-senior-frontend-engineer-austin' : `sha256:fictional-${index}`,
  company: index === 0 ? 'Northstar Labs' : ['Brightline', 'Cedar', 'Orbit', 'Harbor', 'Atlas', 'Mosaic'][index - 1],
  role: index === 0 ? 'Senior Frontend Engineer' : 'Frontend Engineer',
  ats: index % 2 === 0 ? 'greenhouse' : 'generic', status,
  score: 78 - index * 3,
  appliedDate: ['draft', 'ready'].includes(status) ? null : `2026-07-${String(18 - index).padStart(2, '0')}`,
  sourceUrl: `https://jobs.example.test/${index + 1}`,
  events: [{ id: `event_00${index + 1}`, type: 'JOB_CAPTURED', occurredAt: `2026-07-${String(10 + index).padStart(2, '0')}T10:00:00Z` }],
}));
