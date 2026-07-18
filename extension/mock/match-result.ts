import { matchResultSchema } from '../schemas/match';

export const mockMatchResult = matchResultSchema.parse({
  id: 'match_001', jobId: 'job_001', profileId: 'profile_001', score: 78,
  scoringVersion: 'phase-1-mock',
  summary: 'Strong experience match; two gaps need review before tailoring.',
  items: [
    { id: 'req_react', requirement: '8+ years building React products', classification: 'matched', sourceFactIds: ['fact_react'], scoreContribution: 22, reason: 'Verified fact records 9 years of React product work.', hardGate: true },
    { id: 'req_lead', requirement: 'Experience leading frontend engineers', classification: 'matched', sourceFactIds: ['fact_leadership'], scoreContribution: 18, reason: 'Verified leadership evidence covers a 12-person group.', hardGate: true },
    { id: 'req_a11y', requirement: 'Production accessibility experience', classification: 'matched', sourceFactIds: ['fact_accessibility'], scoreContribution: 18, reason: 'Verified WCAG release-check experience directly supports this requirement.', hardGate: true },
    { id: 'req_system', requirement: 'Own a shared design system', classification: 'partial', sourceFactIds: ['fact_leadership'], scoreContribution: 12, reason: 'Leadership is verified, but direct ownership scope needs confirmation.' },
    { id: 'req_graphql', requirement: 'GraphQL experience', classification: 'missing', sourceFactIds: [], scoreContribution: 0, reason: 'No verified GraphQL evidence is present.' },
    { id: 'req_fintech', requirement: 'Fintech domain experience', classification: 'unknown', sourceFactIds: [], scoreContribution: 0, reason: 'The candidate profile does not confirm a product domain.' },
  ],
});
