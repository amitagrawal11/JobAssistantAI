import type { JobPosting } from '../../schemas/job-posting';

export type JobCardMetadataTone = 'neutral' | 'primary' | 'success' | 'warning';

export type JobCardMetadataItem = {
  key: string;
  label: string;
  tone: JobCardMetadataTone;
};

const readable = (value: string): string =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  on_site: 'On-site',
  lead_staff_principal: 'Staff+',
  work_authorization_required: 'Work authorization required',
  bachelors: 'Bachelor’s degree',
  masters: 'Master’s degree',
  doctorate: 'Doctorate required',
  associate: 'Associate degree',
  high_school: 'High school diploma',
  equivalent_experience: 'Degree or equivalent experience',
};

const meaningful = (value: string | null | undefined): value is string =>
  Boolean(value && value !== 'unknown' && value !== 'none_mentioned');

export function formatPostedDate(postedAt: string | null): string | null {
  if (!postedAt) return null;
  const date = new Date(postedAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function compactAmount(value: number): string {
  if (value < 1_000) return String(value);
  const thousands = value / 1_000;
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1).replace(/\.0$/, '')}k`;
}

function salaryLabel(job: JobPosting): string | null {
  if (job.salary_min === null && job.salary_max === null) return null;
  const currency = job.salary_currency ? `${job.salary_currency.toUpperCase()} ` : '';
  const period = job.salary_period ? `/${job.salary_period}` : '';
  if (job.salary_min !== null && job.salary_max !== null) {
    return `${currency}${compactAmount(job.salary_min)}–${compactAmount(job.salary_max)}${period}`;
  }
  if (job.salary_min !== null) {
    return `${currency}${compactAmount(job.salary_min)}+${period}`;
  }
  return `Up to ${currency}${compactAmount(job.salary_max as number)}${period}`;
}

export function jobCardMetadata(job: JobPosting): JobCardMetadataItem[] {
  const items: JobCardMetadataItem[] = [];
  const add = (
    key: string,
    label: string | null,
    tone: JobCardMetadataTone = 'neutral',
  ) => {
    if (label && items.length < 4) items.push({ key, label, tone });
  };

  if (job.match_score !== null) {
    add('match', `${Math.round(job.match_score)}% match`, 'primary');
  }
  add('salary', salaryLabel(job));

  if (job.sponsorship === 'available') {
    add('sponsorship', 'Visa sponsorship', 'success');
  }

  const languages = job.languages.filter(
    (language, index, all) =>
      language.toLowerCase() !== 'english'
      && all.findIndex((item) => item.toLowerCase() === language.toLowerCase()) === index,
  );
  for (const language of languages) {
    add(`language-${language}`, `${language} required`);
  }

  if (meaningful(job.workplace_type)) {
    add('workplace', LABELS[job.workplace_type] ?? readable(job.workplace_type));
  }
  if (job.employment_type === 'other') {
    const commitment = job.commitment?.trim();
    if (commitment && !['other', 'unknown'].includes(commitment.toLowerCase())) {
      add('employment', commitment);
    }
  } else if (meaningful(job.employment_type)) {
    add('employment', LABELS[job.employment_type] ?? readable(job.employment_type));
  }
  if (meaningful(job.experience_level)) {
    add('experience', LABELS[job.experience_level] ?? readable(job.experience_level));
  }
  if (meaningful(job.travel) && job.travel !== 'none') {
    add('travel', `${readable(job.travel)} travel`);
  }
  if (meaningful(job.degree_level)) {
    add('degree', LABELS[job.degree_level] ?? readable(job.degree_level));
  }

  for (const skill of job.skills.slice(0, 2)) {
    add(`skill-${skill}`, skill);
  }
  return items;
}
