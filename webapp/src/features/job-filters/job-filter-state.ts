export const WORKPLACE_TYPES = ['remote', 'hybrid', 'on_site'] as const;
export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'internship', 'temporary', 'volunteer', 'other'] as const;
export const ROLE_CATEGORIES = ['engineering', 'product', 'design', 'data', 'quality_testing', 'devops_infrastructure', 'security', 'management', 'sales', 'marketing', 'customer_success', 'finance', 'people_hr', 'operations', 'other'] as const;
export const EXPERIENCE_LEVELS = ['internship', 'entry', 'associate', 'mid', 'senior', 'lead_staff_principal', 'manager', 'director', 'executive'] as const;
export const APPLICATION_METHODS = ['quick_apply', 'company_site'] as const;
export const SPONSORSHIP = ['available', 'unavailable', 'work_authorization_required'] as const;
export const MATCH_LEVELS = ['strong', 'possible', 'stretch', 'not_analyzed'] as const;
export const HANDLED_FILTERS = ['hide_applied', 'hide_dismissed', 'saved_only', 'analyzed_only', 'auto_apply_eligible'] as const;
export const SORTS = ['newest', 'oldest', 'company_asc', 'company_desc', 'best_match'] as const;

export type JobFilterState = {
  include: string[];
  exclude: string[];
  locations: string[];
  workplaceTypes: string[];
  companies: string[];
  roleCategories: string[];
  employmentTypes: string[];
  experienceLevels: string[];
  applicationMethods: string[];
  vendors: string[];
  sponsorship: string[];
  skills: string[];
  languages: string[];
  profileId: string;
  matchLevels: string[];
  handled: string[];
  sort: string;
  page: number;
};

export const DEFAULT_JOB_FILTERS: JobFilterState = {
  include: [], exclude: [], locations: [],
  workplaceTypes: [], companies: [], roleCategories: [], employmentTypes: [],
  experienceLevels: [], applicationMethods: ['company_site'], vendors: [], sponsorship: [],
  skills: [], languages: [], profileId: '', matchLevels: [],
  handled: [], sort: 'newest', page: 1,
};

const REPEATED: Record<string, keyof JobFilterState> = {
  include: 'include', exclude: 'exclude', location: 'locations',
  workplace_type: 'workplaceTypes', company: 'companies',
  role_category: 'roleCategories', employment_type: 'employmentTypes',
  experience_level: 'experienceLevels', application_method: 'applicationMethods',
  vendor: 'vendors',
  sponsorship: 'sponsorship', skill: 'skills', language: 'languages',
  match_level: 'matchLevels',
  handled: 'handled',
};

const ALLOWED: Partial<Record<keyof JobFilterState, readonly string[]>> = {
  workplaceTypes: WORKPLACE_TYPES, roleCategories: ROLE_CATEGORIES,
  employmentTypes: EMPLOYMENT_TYPES, experienceLevels: EXPERIENCE_LEVELS,
  applicationMethods: APPLICATION_METHODS, sponsorship: SPONSORSHIP,
  matchLevels: MATCH_LEVELS, handled: HANDLED_FILTERS,
};

export function parseJobFilterSearch(search: string): JobFilterState {
  const params = new URLSearchParams(search);
  const next: JobFilterState = { ...DEFAULT_JOB_FILTERS };
  for (const [param, key] of Object.entries(REPEATED)) {
    const values = params.getAll(param).map((value) => value.trim()).filter(Boolean);
    const allowed = ALLOWED[key];
    (next[key] as string[]) = allowed ? values.filter((value) => allowed.includes(value)) : values;
  }
  if (next.applicationMethods.length === 0) {
    next.applicationMethods = ['company_site'];
  }
  next.profileId = params.get('profile_id') ?? '';
  const page = Number(params.get('page'));
  next.page = Number.isInteger(page) && page > 0 ? page : 1;
  const sort = params.get('sort');
  next.sort = sort && SORTS.includes(sort as (typeof SORTS)[number]) ? sort : 'newest';
  return next;
}

export function serializeJobFilterSearch(state: JobFilterState): string {
  const params = new URLSearchParams();
  for (const [param, key] of Object.entries(REPEATED)) {
    const values = state[key] as string[];
    if (
      key === 'applicationMethods'
      && values.length === 1
      && values[0] === 'company_site'
    ) continue;
    for (const value of values) if (value.trim()) params.append(param, value.trim());
  }
  const scalar: Array<[string, string | number | null]> = [
    ['profile_id', state.profileId],
  ];
  for (const [key, value] of scalar) if (value !== '' && value !== null) params.set(key, String(value));
  if (state.sort !== 'newest') params.set('sort', state.sort);
  if (state.page !== 1) params.set('page', String(state.page));
  return params.toString();
}
