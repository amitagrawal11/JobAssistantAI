import { describe, expect, it } from 'vitest';
import type { JobPosting } from '../../schemas/job-posting';
import { formatPostedDate, jobCardMetadata } from './job-card-metadata';

const job = (overrides: Partial<JobPosting> = {}): JobPosting => ({
  id: 'job-1',
  vendor: 'greenhouse',
  company: 'Example',
  title: 'Staff Engineer',
  team: 'Infrastructure',
  location: 'Berlin, Germany',
  commitment: null,
  hosted_url: 'https://example.com/jobs/1',
  apply_url: null,
  posted_at: '2026-07-29T20:32:19Z',
  is_active: true,
  workplace_type: 'unknown',
  employment_type: 'unknown',
  role_category: 'engineering',
  experience_level: 'unknown',
  max_experience: 'unknown',
  degree_level: 'none_mentioned',
  sponsorship: 'unknown',
  salary_min: null,
  salary_max: null,
  salary_currency: null,
  salary_period: null,
  skills: [],
  languages: [],
  industry: 'unknown',
  travel: 'unknown',
  enrichment_evidence: [],
  saved: false,
  dismissed: false,
  match_score: null,
  match_level: null,
  missing_critical_skills: null,
  ...overrides,
});

describe('job card metadata', () => {
  it('formats an absolute posted date and omits invalid dates', () => {
    expect(formatPostedDate('2026-07-29T20:32:19Z')).toBe('Jul 29, 2026');
    expect(formatPostedDate(null)).toBeNull();
    expect(formatPostedDate('not-a-date')).toBeNull();
  });

  it('prioritizes candidate-impacting facts and caps the result at four', () => {
    expect(jobCardMetadata(job({
      match_score: 92,
      salary_min: 100_000,
      salary_max: 150_000,
      salary_currency: 'USD',
      salary_period: 'year',
      sponsorship: 'available',
      languages: ['German'],
      workplace_type: 'remote',
      employment_type: 'full_time',
      skills: ['AWS'],
    }))).toEqual([
      { key: 'match', label: '92% match', tone: 'primary' },
      { key: 'salary', label: 'USD 100k–150k/year', tone: 'neutral' },
      { key: 'sponsorship', label: 'Visa sponsorship', tone: 'success' },
      { key: 'language-German', label: 'German required', tone: 'neutral' },
    ]);
  });

  it('omits non-sponsored states and uses the space for more useful metadata', () => {
    for (const sponsorship of ['unavailable', 'work_authorization_required'] as const) {
      expect(jobCardMetadata(job({
        sponsorship,
        workplace_type: 'remote',
        employment_type: 'full_time',
      }))).toEqual([
        { key: 'workplace', label: 'Remote', tone: 'neutral' },
        { key: 'employment', label: 'Full-time', tone: 'neutral' },
      ]);
    }
  });

  it('suppresses English and unknown values while labeling available sponsorship', () => {
    expect(jobCardMetadata(job({
      sponsorship: 'available',
      languages: ['English', 'French'],
      workplace_type: 'hybrid',
      employment_type: 'contract',
      experience_level: 'senior',
    }))).toEqual([
      { key: 'sponsorship', label: 'Visa sponsorship', tone: 'success' },
      { key: 'language-French', label: 'French required', tone: 'neutral' },
      { key: 'workplace', label: 'Hybrid', tone: 'neutral' },
      { key: 'employment', label: 'Contract', tone: 'neutral' },
    ]);
  });

  it('replaces generic employment type other with an exact source commitment', () => {
    expect(jobCardMetadata(job({
      employment_type: 'other',
      commitment: 'Permanent',
    }))).toContainEqual({
      key: 'employment',
      label: 'Permanent',
      tone: 'neutral',
    });

    expect(jobCardMetadata(job({
      employment_type: 'other',
      commitment: 'Short Term',
    }))).toContainEqual({
      key: 'employment',
      label: 'Short Term',
      tone: 'neutral',
    });

    expect(jobCardMetadata(job({
      employment_type: 'other',
      commitment: null,
    }))).not.toContainEqual(expect.objectContaining({ key: 'employment' }));
  });

  it('uses meaningful constraints before falling back to at most two skills', () => {
    expect(jobCardMetadata(job({
      travel: 'occasional',
      degree_level: 'bachelors',
      skills: ['AWS', 'SQL', 'Kubernetes'],
    }))).toEqual([
      { key: 'travel', label: 'Occasional travel', tone: 'neutral' },
      { key: 'degree', label: 'Bachelor’s degree', tone: 'neutral' },
      { key: 'skill-AWS', label: 'AWS', tone: 'neutral' },
      { key: 'skill-SQL', label: 'SQL', tone: 'neutral' },
    ]);
  });
});
