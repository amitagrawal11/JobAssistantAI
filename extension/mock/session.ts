import { sessionSchema } from '../schemas/session';
import { mockApplications } from './applications';
import { mockCandidate } from './candidate';
import { mockDocuments } from './documents';
import { mockFillPlan } from './fill-plan';
import { mockJob } from './job';
import { mockMatchResult } from './match-result';

export const mockSession = sessionSchema.parse({
  schemaVersion: 1,
  workflowStatus: 'job_detected',
  profile: mockCandidate,
  job: mockJob,
  matchResult: mockMatchResult,
  documents: mockDocuments,
  fillPlan: mockFillPlan,
  applications: mockApplications,
});
