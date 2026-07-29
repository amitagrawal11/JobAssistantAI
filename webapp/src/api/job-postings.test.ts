import { describe, expect, it } from 'vitest';
import { buildJobPostingParams } from './job-postings';
import { DEFAULT_JOB_FILTERS } from '../features/job-filters/job-filter-state';

describe('job posting request parameters', () => {
  it('serializes repeated values and candidate filters', () => {
    const params = buildJobPostingParams({
      ...DEFAULT_JOB_FILTERS,
      include: ['react', 'typescript'],
      companies: ['Figma', 'Stripe'],
      workplaceTypes: ['remote'],
      profileId: 'profile-1',
      handled: ['hide_applied', 'saved_only'],
      sort: 'best_match',
      page: 2,
    }, 24);
    expect(params.getAll('include')).toEqual(['react', 'typescript']);
    expect(params.getAll('company')).toEqual(['Figma', 'Stripe']);
    expect(params.get('hide_applied')).toBe('true');
    expect(params.get('saved_only')).toBe('true');
    expect(params.get('sort')).toBe('best_match');
    expect(params.get('page')).toBe('2');
  });
});
