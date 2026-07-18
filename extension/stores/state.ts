import type { ApplicationRecord } from '../schemas/application';
import type { ApplicationStatus } from '../schemas/common';
import type { GeneratedDocuments } from '../schemas/document';
import type { FillPlan } from '../schemas/fill-plan';
import type { Job } from '../schemas/job';
import type { MatchResult } from '../schemas/match';
import type { CandidateProfile } from '../schemas/profile';

export type DashboardSection = 'profile' | 'documents' | 'applications' | 'settings';
export type ApplicationFilter = 'all' | 'active' | 'applied' | 'closed';

export interface ApplicationState {
  hydrated: boolean;
  recoveryNotice: string | null;
  transientError: string | null;
  workflowStatus: ApplicationStatus;
  profile: CandidateProfile;
  job: Job;
  matchResult: MatchResult;
  documents: GeneratedDocuments;
  fillPlan: FillPlan;
  applications: ApplicationRecord[];
  dashboardSection: DashboardSection;
  applicationFilter: ApplicationFilter;
}
