import type { ApplicationStore } from './application-store';

export const selectCurrentStep = (state: ApplicationStore) => {
  if (['idle', 'job_detected', 'analyzing', 'failed'].includes(state.workflowStatus)) return 'scan';
  if (state.workflowStatus === 'scored') return 'match';
  if (['tailoring', 'reviewing'].includes(state.workflowStatus)) return 'tailor';
  if (['ready_to_fill', 'filling'].includes(state.workflowStatus)) return 'fill';
  return 'confirm';
};
export const selectMatchSummary = (state: ApplicationStore) => state.matchResult;
export const selectApprovedFillEntries = (state: ApplicationStore) => state.fillPlan.entries.filter((entry) => entry.selected);
export const selectProfileReadiness = (state: ApplicationStore) => state.profile.verification.status === 'ready';
