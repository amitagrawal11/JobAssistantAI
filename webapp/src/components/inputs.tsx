import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/cn';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NOW_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: NOW_YEAR - 1969 }, (_, i) => String(NOW_YEAR + 1 - i));

const MONTH_IDX: Record<string, number> = {};
['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
  .forEach((m, i) => { MONTH_IDX[m] = i; MONTH_IDX[m.slice(0, 3)] = i; });

function normMonth(s: string): string {
  const idx = MONTH_IDX[s.trim().toLowerCase()];
  return idx != null ? MONTHS[idx] : '';
}

type Range = { sM: string; sY: string; eM: string; eY: string; current: boolean };

export function parseDateRange(v: string): Range {
  const parts = (v || '').split(/\s*[-–—]\s*|\s+to\s+/i);
  const startStr = parts[0] ?? '';
  const endStr = parts.slice(1).join(' - ');
  const current = /present|current|now|ongoing|to date/i.test(endStr);
  const pick = (s: string) => {
    const mo = s.match(/[A-Za-z]{3,9}/);
    const yr = s.match(/\b(?:19|20)\d{2}\b/);
    return { mon: mo ? normMonth(mo[0]) : '', yr: yr ? yr[0] : '' };
  };
  const s = pick(startStr);
  const e = current ? { mon: '', yr: '' } : pick(endStr);
  return { sM: s.mon, sY: s.yr, eM: e.mon, eY: e.yr, current };
}

function formatDateRange(r: Range): string {
  const start = [r.sM, r.sY].filter(Boolean).join(' ');
  const end = r.current ? 'Present' : [r.eM, r.eY].filter(Boolean).join(' ');
  return [start, end].filter(Boolean).join(' - ');
}

/** Start (month+year) → End (month+year) with a "currently ongoing" toggle. Reads/writes a "Mon YYYY - Present" string. */
export function MonthYearRange({ value, onChange, currentLabel }: { value: string; onChange: (v: string) => void; currentLabel: string }) {
  const r = parseDateRange(value);
  const set = (patch: Partial<Range>) => onChange(formatDateRange({ ...r, ...patch }));
  const mini = 'h-8 px-2 py-1 text-[13px]';
  return (
    <div className="mt-1 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-9 shrink-0 text-[11px] font-medium text-muted-foreground">Start</span>
        <div className="w-[78px]"><Combobox value={r.sM} options={MONTHS} placeholder="Month" onChange={(m) => set({ sM: m })} className={mini} /></div>
        <div className="w-[78px]"><Combobox value={r.sY} options={YEARS} placeholder="Year" onChange={(y) => set({ sY: y })} className={mini} /></div>
      </div>
      {!r.current && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-9 shrink-0 text-[11px] font-medium text-muted-foreground">End</span>
          <div className="w-[78px]"><Combobox value={r.eM} options={MONTHS} placeholder="Month" onChange={(m) => set({ eM: m })} className={mini} /></div>
          <div className="w-[78px]"><Combobox value={r.eY} options={YEARS} placeholder="Year" onChange={(y) => set({ eY: y })} className={mini} /></div>
        </div>
      )}
      <label className="flex items-center gap-2 text-[13px] text-foreground">
        <Checkbox checked={r.current} onCheckedChange={(c) => set({ current: c === true, eM: '', eY: '' })} />
        {currentLabel}
      </label>
    </div>
  );
}

/** Type-and-select input: focus shows the full (scrollable) list; typing filters it; free text allowed. */
export function Combobox({ value, onChange, options, placeholder, className }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(false);
  const q = value.trim().toLowerCase();
  const base = [...new Set(options)].filter(Boolean);
  const list = (typed && q ? base.filter((o) => o.toLowerCase().includes(q)) : base)
    .filter((o) => o.toLowerCase() !== q)
    .slice(0, 60);
  const choose = (o: string) => { onChange(o); setTyped(false); setOpen(false); };
  return (
    <div className="relative">
      <input value={value} placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setTyped(true); setOpen(true); }}
        onFocus={() => { setTyped(false); setOpen(true); }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className={cn('w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]', className)} />
      {open && list.length > 0 && (
        <div className="absolute left-0 top-full z-40 mt-1 max-h-56 w-full min-w-[7rem] overflow-y-auto overscroll-contain rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-pop)]">
          {list.map((o) => (
            <button type="button" key={o} onMouseDown={(e) => { e.preventDefault(); choose(o); }}
              className="block w-full truncate rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted">{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/** shadcn Select for a fixed option list, with a leading placeholder. */
export function SelectField({ value, onChange, options, placeholder, className }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; className?: string;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={cn('w-full bg-card text-sm', className)}><SelectValue placeholder={placeholder ?? 'Select…'} /></SelectTrigger>
      <SelectContent className="max-h-64">{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export const KNOWN_SKILLS = [
  'TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'Rust', 'C#', 'C++', 'Ruby', 'PHP', 'Kotlin', 'Swift', 'SQL',
  'HTML5', 'CSS3', 'SASS', 'Tailwind CSS', 'React', 'Next.js', 'Angular', 'Vue', 'Svelte', 'RxJS', 'Redux',
  'Redux Toolkit', 'RTK Query', 'GraphQL', 'Node.js', 'Express.js', 'NestJS', 'Spring', 'Django', 'FastAPI', '.NET',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'DynamoDB', 'SQLite', 'Elasticsearch',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'GitLab CI/CD', 'GitHub Actions', 'CI/CD',
  'Jest', 'Vitest', 'Playwright', 'Cypress', 'Testing Library', 'SonarQube',
  'Micro Frontends', 'Design Systems', 'Performance Engineering', 'Core Web Vitals', 'Accessibility', 'WCAG',
  'System Design', 'Distributed Systems', 'Platform Engineering', 'Observability', 'OpenTelemetry', 'Datadog',
  'OAuth2', 'OWASP', 'REST APIs', 'gRPC', 'WebSockets', 'Kafka', 'RabbitMQ', 'Spark',
  'Agile', 'Scrum', 'Mentoring', 'Stakeholder Management', 'Technical Leadership',
];
export const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Germany', 'France', 'Netherlands',
  'Ireland', 'Spain', 'Portugal', 'Italy', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Switzerland',
  'Belgium', 'Austria', 'Poland', 'Czech Republic', 'Romania', 'Greece', 'Cyprus', 'United Arab Emirates',
  'Saudi Arabia', 'Qatar', 'Singapore', 'Malaysia', 'Japan', 'South Korea', 'China', 'Hong Kong',
  'New Zealand', 'Brazil', 'Mexico', 'Argentina', 'South Africa', 'Nigeria', 'Kenya', 'Egypt', 'Israel',
  'Turkey', 'Indonesia', 'Philippines', 'Vietnam', 'Thailand', 'Pakistan', 'Bangladesh', 'Sri Lanka',
];
export const VISA_TYPES = [
  'Citizen', 'Permanent Resident', 'Work Visa (H-1B)', 'Work Visa (L-1)', 'Work Permit',
  'Student Visa (F-1/OPT)', 'Dependent Visa', 'Requires Sponsorship', 'Other',
];
export const NOTICE_PERIODS = ['Immediate', '1 week', '2 weeks', '1 month', '2 months', '3 months', 'Other'];
export const EARLIEST_START = ['Immediately', 'Within 2 weeks', 'Within 1 month', 'Within 2 months', 'Flexible'];
export const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
export const PRONOUNS = ['he/him', 'she/her', 'they/them', 'Prefer not to say'];
export const ETHNICITIES = [
  'American Indian or Alaska Native', 'Asian', 'Black or African American', 'Hispanic or Latino',
  'Native Hawaiian or Other Pacific Islander', 'White', 'Two or more races', 'Prefer not to say',
];
export const SOURCES = ['LinkedIn', 'Indeed', 'Company website', 'Referral', 'Job board', 'Recruiter', 'Other'];

export const COMMON_TITLES = [
  'Software Engineer', 'Senior Software Engineer', 'Staff Software Engineer', 'Principal Engineer',
  'Frontend Engineer', 'Senior Frontend Engineer', 'Frontend Architect', 'Backend Engineer',
  'Full Stack Engineer', 'Engineering Manager', 'Senior Engineering Manager', 'Director of Engineering',
  'Lead Web Developer', 'Web Developer', 'Software Development Engineer', 'Tech Lead', 'Solutions Architect',
  'Product Manager', 'Data Engineer', 'DevOps Engineer', 'QA Engineer', 'Mobile Engineer',
];
