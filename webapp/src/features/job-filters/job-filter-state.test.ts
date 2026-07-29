import { describe, expect, it } from 'vitest';
import {
  DEFAULT_JOB_FILTERS,
  parseJobFilterSearch,
  serializeJobFilterSearch,
  type JobFilterState,
} from './job-filter-state';

describe('job filter URL state', () => {
  it('defaults application method to company site', () => {
    expect(parseJobFilterSearch('').applicationMethods).toEqual(['company_site']);
  });

  it('keeps the default application method implicit when serializing', () => {
    expect(serializeJobFilterSearch(DEFAULT_JOB_FILTERS)).toBe('');
    expect(serializeJobFilterSearch({
      ...DEFAULT_JOB_FILTERS,
      applicationMethods: ['quick_apply'],
    })).toBe('application_method=quick_apply');
  });

  it('round-trips repeated facets and advanced values', () => {
    const state: JobFilterState = {
      ...DEFAULT_JOB_FILTERS,
      include: ['react', '"design systems"'],
      exclude: ['wordpress'],
      locations: ['Amsterdam', 'Remote - Europe'],
      companies: ['Figma', 'Stripe'],
      workplaceTypes: ['remote', 'hybrid'],
      employmentTypes: ['full_time'],
      roleCategories: ['engineering', 'design'],
      experienceLevels: ['senior'],
      applicationMethods: ['company_site'],
      vendors: ['greenhouse', 'ashby'],
      sponsorship: ['available'],
      skills: ['React', 'TypeScript'],
      languages: ['English'],
      profileId: 'profile-1',
      matchLevels: ['strong'],
      handled: ['hide_applied', 'saved_only'],
      sort: 'best_match',
      page: 3,
    };

    expect(parseJobFilterSearch(serializeJobFilterSearch(state))).toEqual(state);
  });

  it('ignores invalid enum values and impossible scalar values', () => {
    const parsed = parseJobFilterSearch(
      '?workplace_type=teleport&sort=random&page=-2',
    );
    expect(parsed).toEqual({
      ...DEFAULT_JOB_FILTERS,
      applicationMethods: ['company_site'],
    });
  });

  it('does not serialize blank or default values', () => {
    expect(serializeJobFilterSearch(DEFAULT_JOB_FILTERS)).toBe('');
  });

  it('ignores retired legacy filter parameters', () => {
    const legacy = [
      'posted_after=2026-07-01', 'posted_before=2026-07-29',
      'salary_min=100000', 'salary_max=200000', 'salary_currency=EUR',
      'minimum_match_score=80', 'missing_skills=none',
      'max_experience=three_to_five', 'degree_level=bachelors',
      'industry=fintech', 'travel=none',
    ].join('&');

    expect(parseJobFilterSearch(legacy)).toEqual({
      ...DEFAULT_JOB_FILTERS,
      applicationMethods: ['company_site'],
    });
  });
});
