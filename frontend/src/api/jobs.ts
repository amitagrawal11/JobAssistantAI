import { backendMatchSchema, jobAnalysisSchema, type JobAnalysis } from '../schemas/backend';
import { apiRequest } from './client';

export function analyzeJob(input: { profile_id: string; description: string }) {
  return apiRequest('/jobs/analyze', jobAnalysisSchema, { method: 'POST', body: JSON.stringify(input) }, 360_000);
}

export function scoreMatch(profileId: string, job: JobAnalysis) {
  return apiRequest('/matches/score', backendMatchSchema, { method: 'POST', body: JSON.stringify({ profile_id: profileId, job_id: job.job_id }) }, 360_000);
}
