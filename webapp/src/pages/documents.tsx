import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud, FileText, Loader2, Sparkles, RefreshCw, Pencil, Plus,
  GraduationCap, Briefcase, Rocket, ListPlus, Trash2,
  Check, X, Code2, Award, Link2, IdCard, Globe, Phone, FolderOpen, Star,
} from 'lucide-react';
import { addProfileFact, createProfile, deleteProfile, deleteProfileFact, getProfile, listProfiles, profileQueryKey, setDefaultProfile, updateProfile, verifyProfileFacts } from '../api/profiles';
import type { ProfileUpdate } from '../schemas/backend';
import { uploadDocument, executeParse } from '../api/documents';
import { useActiveProfileId, setActiveProfileId, clearActiveProfileId } from '../lib/active-profile';
import { markParsing, clearParsing, useIsParsing } from '../lib/parsing-state';
import { MonthYearRange, Combobox, COMMON_TITLES, COUNTRIES, VISA_TYPES, NOTICE_PERIODS, EARLIEST_START, GENDERS, PRONOUNS, ETHNICITIES, SOURCES, KNOWN_SKILLS } from '../components/inputs';
import { BackendError } from '../api/client';
import type { BackendProfile } from '../schemas/backend';

type Fact = BackendProfile['facts'][number];

type Phase = 'idle' | 'creating' | 'uploading' | 'parsing';
const PHASE_LABEL: Record<Phase, string> = {
  idle: '',
  creating: 'Creating your profile…',
  uploading: 'Uploading your resume…',
  parsing: 'Extracting your experience (this can take a minute)…',
};

/* ----------------------------- shared bits ----------------------------- */

function initials(text: string): string {
  const words = text.trim().split(/[\s,]+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '—';
}

function prettyKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// The person's real name comes from the resume (identity/contact facts), not the
// profile's display_name — display_name is a user-chosen label for the profile.
function personNameOf(p: BackendProfile): string | undefined {
  const keys = ['full_name', 'name', 'candidate_name'];
  for (const cat of ['identity', 'contact']) {
    const hit = p.facts.find((f) => f.category === cat && keys.includes(f.key));
    if (hit?.value?.trim()) return hit.value.trim();
  }
  const nameFromContact = (p.contact as Record<string, string> | undefined)?.name;
  return nameFromContact?.trim() || undefined;
}

function stripRefs(text: string): string {
  // Strip element-id references models leak in any shape: "(#/texts/16)",
  // "(element_ids: [#/texts/16])", bare "element_ids: [#/texts/24]" (even unclosed),
  // or a stray "#/texts/24".
  return text
    .replace(/\s*\(?\s*element[_ ]?ids?\s*:?\s*\[?[^)\]]*\]?\)?/gi, ' ')
    .replace(/\s*\(?\s*#\/texts\/\d+\s*\)?/gi, ' ')
    .replace(/\[[\s,;:.'"“”‘’·|-]*\]/g, ' ') // citation brackets left with only punctuation/whitespace, e.g. "[ ]" or "[, ' ']"
    .replace(/\(\s*\)/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')  // drop the space left before punctuation after a removal
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* ----------------------------- onboarding ----------------------------- */

function Onboarding({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel?: () => void }) {
  const queryClient = useQueryClient();
  const [profileName, setProfileName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const fileRef = useRef<HTMLInputElement>(null);

  const onboard = useMutation({
    mutationFn: async () => {
      setPhase('creating');
      const profile = await createProfile({ display_name: profileName.trim(), email: null });
      setPhase('uploading');
      const up = await uploadDocument(profile.id, file as File);
      return { profile, operationId: up.operation_id };
    },
    // Don't block on extraction: open the profile (which shows shimmering
    // section skeletons) immediately and let the parse finish in the background.
    onSuccess: async ({ profile, operationId }) => {
      markParsing(profile.id);
      queryClient.setQueryData(profileQueryKey(profile.id), profile); // seed so the skeleton shows instantly
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      await setActiveProfileId(profile.id);
      onCreated(profile.id);
      executeParse(operationId)
        .catch(() => { /* surfaced via readiness on the profile page */ })
        .finally(async () => {
          await queryClient.invalidateQueries({ queryKey: profileQueryKey(profile.id) });
          clearParsing(profile.id);
        });
    },
    onSettled: () => setPhase('idle'),
  });

  const busy = onboard.isPending;
  const canSubmit = profileName.trim().length > 0 && !!file && !busy;

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-primary">New profile</p>
      <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em] text-foreground">Create a profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">Name it and upload a resume — Pathway extracts your details automatically.</p>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <label className="block text-[13px] font-medium text-foreground">
          Profile name
          <input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="e.g. Engineering Manager V1" disabled={busy}
            className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]" />
          <span className="mt-1 block text-xs text-muted-foreground">A label to tell your profiles apart — create multiple versions for different roles or résumés (e.g. “Engineering Manager V1”, “Staff Engineer V2”). Your real name comes from the resume.</span>
        </label>

        <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
          className={'mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ' + (file ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/40')}>
          {file ? <FileText className="size-7 text-primary" /> : <UploadCloud className="size-7 text-muted-foreground" />}
          <span className="text-sm font-medium text-foreground">{file ? file.name : 'Click to upload your resume'}</span>
          <span className="text-xs text-muted-foreground">{file ? `${(file.size / 1024).toFixed(0)} KB · click to change` : 'PDF or DOCX, up to 10 MB'}</span>
        </button>

        {onboard.isError ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            {onboard.error instanceof BackendError ? onboard.error.message : 'Something went wrong. Please try again.'}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={() => onboard.mutate()} disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_4px_11px_-5px_oklch(0.66_0.19_265_/_0.5)] hover:bg-[var(--primary-hover)] disabled:opacity-50">
            {busy ? <><Loader2 className="size-4 animate-spin" /> Working…</> : <><Sparkles className="size-4" /> Create profile & extract</>}
          </button>
          {onCancel ? <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50">Cancel</button> : null}
          {busy ? <span className="text-[13px] text-muted-foreground">{PHASE_LABEL[phase]}</span> : null}
        </div>
      </section>
    </div>
  );
}

/* ----------------------------- parsers ----------------------------- */

const DATE_RANGE = /([A-Za-z]{3,9}\.?\s*\d{4}|\d{4})\s*[–—-]+\s*(Present|Current|[A-Za-z]{3,9}\.?\s*\d{4}|\d{4})/i;

function splitBullets(text: string): string[] {
  return text
    .split(/(?<=[.;])\s+(?=[A-Z(])/)
    .map((s) => s.replace(/^[-•\s]+/, '').trim())
    .filter((s) => s.length > 12);
}

type ParsedRole = { title: string; company?: string; dates?: string; hasHeader?: boolean; bullets: string[] };

function parseExperience(fact: Fact): ParsedRole {
  const v = fact.value;
  // The model phrases roles two ways depending on the resume/run:
  //   labeled   -> "Company: X, Title: Y, Dates: Z, Location: L. Achievements: ..."
  //   narrative -> "Y at X (Z, L). Responsibilities include ..."
  // Support both, otherwise a whole resume collapses into one "role".
  let company = v.match(/Company:\s*([^,|]+)/i)?.[1]?.trim();
  let title = v.match(/Title:\s*([^,|]+?)(?:,\s*(?:Dates?|Location)|$)/i)?.[1]?.trim();
  let dates = v.match(/Dates?:\s*([^,|]+?)(?:,\s*Location|\.|$)/i)?.[1]?.trim() || v.match(DATE_RANGE)?.[0];
  let desc = v;

  if (!company && !title) {
    const m = v.match(/^\s*(.+?)\s+at\s+([^(]+?)\s*\(([^)]*)\)\s*\.?\s*([\s\S]*)$/i);
    if (m) {
      title = m[1].trim();
      company = m[2].trim();
      dates = m[3].match(DATE_RANGE)?.[0] || dates;
      desc = m[4] || '';
    }
  }

  if (desc === v) {
    const marker = v.search(/Achievements?(?:\s+include)?:?/i);
    if (marker >= 0) {
      const colon = v.indexOf(':', marker);
      desc = v.slice((colon >= 0 ? colon + 1 : marker + 12));
    } else if (company || title || dates) {
      desc = v.replace(/^.*?(?:Location:[^.]*\.|Dates?:[^.]*\.)/is, '').trim() || v;
    }
  }
  desc = stripRefs(desc).replace(/^(?:achievements?|responsibilities|progress(?:ion)?)\s*(?:include[ds]?|including)?:?\s*/i, '');
  const bullets = splitBullets(desc).map(stripRefs);
  const hasHeader = !!(company || title);
  return { title: title || prettyKey(fact.key), company, dates, hasHeader, bullets: bullets.length ? bullets : (desc.trim() ? [desc.trim()] : []) };
}

// Models sometimes split one role across "experience_N" + several "experience_N_cont"
// facts. Merge continuation facts (marked _cont, or lacking a Company/Title header)
// back into the preceding role so each job renders once.
// Group experience facts into roles, keeping the fact ids per role, so the editor can show
// one form (with a single highlights box) per company and write everything back
// to the role's primary fact when saving.
type EditableRole = { primaryId: string; factIds: string[]; company: string; title: string; dates: string; bullets: string[] };
function groupExperienceEditable(facts: Fact[]): EditableRole[] {
  const roles: EditableRole[] = [];
  for (const f of facts) {
    const p = parseExperience(f);
    const last = roles[roles.length - 1];
    const sameRole = !!last && !!p.company && !!last.company
      && p.company.toLowerCase() === last.company.toLowerCase()
      && (p.title ?? '').toLowerCase() === (last.title ?? '').toLowerCase();
    const isCont = /cont|_\d+_/i.test(f.key) || !p.hasHeader;
    if (last && (isCont || sameRole)) {
      last.factIds.push(f.id);
      last.bullets.push(...p.bullets);
    } else {
      roles.push({ primaryId: f.id, factIds: [f.id], company: p.company ?? '', title: p.hasHeader ? p.title : '', dates: p.dates ?? '', bullets: [...p.bullets] });
    }
  }
  for (const r of roles) r.bullets = [...new Set(r.bullets)];
  return roles;
}

function parseEducation(fact: Fact): { institution: string; degree?: string; dates?: string } {
  let v = stripRefs(fact.value);
  const dates = v.match(DATE_RANGE)?.[0];
  // Drop a trailing/empty "Dates: ..." clause and any field labels the model emitted.
  v = v.replace(/,?\s*Dates?:\s*[^,]*(?=,|$)/i, '').replace(/\b(?:Institution|Degree|Name|Title):\s*/gi, '');
  let rest = (dates ? v.replace(dates, '') : v).replace(/[,–—-]\s*$/, '').trim();
  let institution = rest, degree: string | undefined;
  if (rest.includes(' - ')) {
    const [a, ...b] = rest.split(' - ');
    institution = a.trim();
    degree = b.join(' - ').trim();
  } else if (/\bfrom\b/i.test(rest)) {
    const m = rest.match(/^(.*?)\s+from\s+(.*)$/i);
    if (m) { degree = m[1].trim(); institution = m[2].trim(); }
  } else if (/^(?:b\.?tech|b\.?e|b\.?sc|m\.?tech|m\.?sc|m\.?s|mba|bachelor|master|ph\.?d|pg|post\s*graduate|diploma)/i.test(rest) && rest.includes(',')) {
    // "Degree, Institution" — the degree comes first.
    const idx = rest.indexOf(',');
    degree = rest.slice(0, idx).trim();
    institution = rest.slice(idx + 1).trim();
  }
  return { institution: institution || prettyKey(fact.key), degree, dates };
}

// The model sometimes crams several degrees into one education fact
// ("PG-DAC … Feb 2013. B.Tech … 2011"). Split on the start of each degree so
// every qualification renders (and edits/deletes) as its own entry.
const DEGREE_KEYWORD = /\b(?:b\.?\s?tech|b\.?e\b|b\.?sc|b\.?a\b|bca|m\.?\s?tech|m\.?sc|m\.?s\b|m\.?a\b|mca|mba|ph\.?\s?d|pg-?dac|post\s*graduate|bachelor|master|diploma|doctorate)\b/gi;
function splitEducationValue(value: string): string[] {
  const v = stripRefs(value);
  const starts: number[] = [];
  DEGREE_KEYWORD.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DEGREE_KEYWORD.exec(v)) !== null) {
    const before = v.slice(Math.max(0, m.index - 2), m.index);
    // A boundary only when it opens the string or follows a sentence break —
    // not mid-clause (e.g. "Diploma" inside a parenthetical).
    if (m.index === 0 || /\.\s$/.test(before)) starts.push(m.index);
  }
  if (starts.length <= 1) return [v];
  const segs: string[] = [];
  for (let i = 0; i < starts.length; i += 1) {
    const end = i + 1 < starts.length ? starts[i + 1] : v.length;
    segs.push(v.slice(starts[i], end).replace(/^[\s.,;–—-]+|[\s.,;–—-]+$/g, '').trim());
  }
  if (starts[0] > 0) segs[0] = `${v.slice(0, starts[0]).trim()} ${segs[0]}`.trim();
  return segs.filter(Boolean);
}

function parseProject(fact: Fact): { name: string; desc: string } {
  const v = stripRefs(fact.value);
  const name = v.match(/Name:\s*([^,]+?)(?:,\s*Description|$)/i)?.[1]?.trim();
  const desc = v.match(/Description:\s*(.+)$/i)?.[1]?.trim();
  if (name) return { name, desc: desc ?? '' };
  // "Project Name: description" — split on the first colon (not hyphens, which
  // also appear inside words like "AI-assisted").
  const colon = v.indexOf(':');
  if (colon > 0 && colon <= 80) return { name: v.slice(0, colon).trim(), desc: v.slice(colon + 1).trim() };
  // Fallback: a spaced dash "Name – description" (spaced so hyphenated words survive).
  const dash = v.match(/^(.{2,80}?)\s+[–—-]\s+(.+)$/);
  if (dash) return { name: dash[1].trim(), desc: dash[2].trim() };
  return { name: prettyKey(fact.key), desc: v };
}

/* ----------------------------- skills categorization ----------------------------- */

const SKILL_GROUPS: { label: string; match: (s: string) => boolean }[] = (() => {
  // Order matters: the first matching bucket wins, so keep specific buckets
  // before broad ones and the catch-all ("Tools & Software") last.
  const sets: Record<string, string[]> = {
    'Programming Languages': ['typescript', 'javascript', 'java', 'python', 'c#', 'c++', 'go', 'golang', 'ruby', 'php', 'kotlin', 'swift', 'html', 'html5', 'css', 'css3', 'sass', 'scss', 'sql'],
    'Frameworks & Libraries': ['react', 'next.js', 'nextjs', 'angular', 'vue', 'svelte', 'rxjs', 'redux', 'redux toolkit', 'rtk query', 'material ui', 'mui', 'spring', 'spring framework', 'express', 'express.js', 'node.js', 'nodejs', 'requirejs', 'storybook', 'ag grid', 'jquery', 'bootstrap', 'tailwind', 'tailwind css', 'graphql', 'rest', 'rest apis', 'webpack', '.net', 'amd', 'react server components', 'ssr'],
    'Databases': ['postgresql', 'postgres', 'mysql', 'firebase', 'supabase', 'redis', 'sequelize', 'hibernate', 'mongodb', 'dynamodb', 'sqlite', 'oracle'],
    'Cloud Platforms': ['aws', 's3', 'cloudfront', 'aws lambda', 'lambda', 'azure', 'gcp', 'ec2', 'cloudwatch', 'akamai cdn'],
    'Architecture': ['frontend architecture', 'platform engineering', 'micro frontends', 'module federation', 'monorepos', 'design systems', 'distributed systems', 'system design', 'domain-driven design', 'api design'],
    'Performance': ['performance engineering', 'core web vitals', 'web vitals', 'rendering optimization', 'lazy loading', 'caching', 'performance'],
    'Testing & QA': ['playwright', 'cypress', 'vitest', 'jest', 'browserstack', 'sonarqube', 'testing', 'unit testing', 'e2e testing', 'automation testing'],
    'Security': ['owasp', 'sast', 'dast', 'iast', 'csp', 'checkmarx', 'acunetix', 'helmet', 'oauth2', 'security', 'application security'],
    'DevOps & CI/CD': ['docker', 'kubernetes', 'terraform', 'gitlab ci/cd', 'jenkins', 'cloudbees', 'teamcity', 'ci/cd', 'github actions'],
    'Observability': ['opentelemetry', 'datadog', 'fullstory', 'logging', 'monitoring', 'observability'],
    'AI Engineering': ['claude code', 'cursor', 'mcp', 'llm workflows', 'ai-assisted development', 'llm', 'rag', 'prompt engineering'],
    'Delivery': ['feature flags', 'launchdarkly', 'code reviews', 'developer experience', 'developer productivity', 'google tag manager', 'release management', 'agile'],
    'Management': ['leadership', 'problem decomposition', 'collaboration', 'communication', 'mentoring', 'mentorship', 'ownership', 'stakeholder management', 'team leadership', 'people management'],
    'Accessibility': ['wcag accessibility', 'accessibility', 'wcag', 'a11y'],
  };
  return [
    ...Object.entries(sets).map(([label, list]) => ({ label, match: (s: string) => list.includes(s.toLowerCase()) })),
    { label: 'Tools & Software', match: () => true },
  ];
})();

// Skills sections sometimes absorb prose (experience/project bullets). A real
// skill is a short name, not a sentence — reject long tokens, sub-headings, and
// anything containing prose connective words.
const SKILL_STOPWORDS = new Set(['to', 'the', 'of', 'for', 'with', 'and', 'in', 'on', 'using', 'via', 'that', 'which', 'from', 'as', 'an', 'are', 'was', 'were', 'is', 'by', 'or', 'their', 'this', 'these', 'such', 'including', 'both', 'over', 'under', 'across', 'through', 'into', 'while']);
function isSkillToken(raw: string): boolean {
  const t = raw.trim().replace(/^[-•\s]+/, '');
  if (t.length < 2 || t.length > 40) return false;
  if (t.endsWith(':')) return false;
  if (!/[a-zA-Z]/.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length > 5) return false;
  if (words.some((w) => SKILL_STOPWORDS.has(w.toLowerCase().replace(/[.,()]/g, '')))) return false;
  return true;
}

function categorizeSkills(skills: string[]): { label: string; items: string[] }[] {
  const groups = SKILL_GROUPS.map((g) => ({ label: g.label, items: [] as string[] }));
  for (const skill of skills) groups[SKILL_GROUPS.findIndex((g) => g.match(skill))].items.push(skill);
  return groups.filter((g) => g.items.length > 0);
}

/* ----------------------------- reusable pieces ----------------------------- */

function SectionCard({ icon: Icon, tone, title, sub, action, children }: {
  icon: ComponentType<{ className?: string }>; tone: string; title: string; sub?: string;
  action?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="group rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-[box-shadow,border-color,background-color] duration-200 hover:border-primary/25 hover:bg-muted/20 hover:shadow-[var(--shadow-pop)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={'flex size-9 items-center justify-center rounded-xl ' + tone}><Icon className="size-4.5" /></span>
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
            {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function HeaderAddBtn({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50">
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Add
    </button>
  );
}

function HeaderEditBtn({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      {active ? 'Close' : <><Pencil className="size-3.5" /> Edit</>}
    </button>
  );
}

// A view row with hover-revealed per-item edit + (red) delete controls.
function EntryRow({ onEdit, onDelete, children }: { onEdit?: () => void; onDelete?: () => void; children: ReactNode }) {
  return (
    <div className="group/entry relative -mx-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted/40">
      {(onEdit || onDelete) ? (
        <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover/entry:opacity-100">
          {onEdit ? <button type="button" onClick={onEdit} title="Edit" className="flex size-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-3" /></button> : null}
          {onDelete ? <button type="button" onClick={onDelete} title="Remove" className="flex size-6 items-center justify-center rounded-md border border-border bg-card text-rose-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="size-3" /></button> : null}
        </div>
      ) : null}
      <div className="pr-14">{children}</div>
    </div>
  );
}

const FIELD_INPUT = 'mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-[var(--ring)]';

const FIELD_DEFS: Record<string, { k: string; label: string; ta?: boolean }[]> = {
  experience: [
    { k: 'company', label: 'Company' },
    { k: 'title', label: 'Title' },
    { k: 'dates', label: 'Dates' },
    { k: 'details', label: 'Highlights (one per line)', ta: true },
  ],
  education: [
    { k: 'institution', label: 'Institution' },
    { k: 'degree', label: 'Degree' },
    { k: 'dates', label: 'Dates' },
  ],
  projects: [
    { k: 'name', label: 'Project name' },
    { k: 'description', label: 'Description', ta: true },
  ],
};

function factToFields(kind: string, f: Fact): Record<string, string> {
  if (kind === 'experience') {
    const r = parseExperience(f);
    return { company: r.company ?? '', title: r.hasHeader ? r.title : '', dates: r.dates ?? '', details: r.bullets.join('\n') };
  }
  if (kind === 'education') {
    const e = parseEducation(f);
    return { institution: e.institution, degree: e.degree ?? '', dates: e.dates ?? '' };
  }
  if (kind === 'projects') {
    const p = parseProject(f);
    return { name: p.name, description: p.desc };
  }
  return { value: stripRefs(f.value) };
}

function fieldsToValue(kind: string, fields: Record<string, string>): string {
  if (kind === 'experience') {
    const head = [
      fields.company?.trim() && `Company: ${fields.company.trim()}`,
      fields.title?.trim() && `Title: ${fields.title.trim()}`,
      fields.dates?.trim() && `Dates: ${fields.dates.trim()}`,
    ].filter(Boolean).join(', ');
    const details = fields.details.split('\n').map((s) => s.trim().replace(/[.;]+$/, '')).filter(Boolean).join('. ');
    return [head && `${head}.`, details && `${details}.`].filter(Boolean).join(' ').trim();
  }
  if (kind === 'education') {
    const base = [fields.institution?.trim(), fields.degree?.trim()].filter(Boolean).join(' - ');
    return [base, fields.dates?.trim()].filter(Boolean).join(', ');
  }
  if (kind === 'projects') {
    const name = fields.name?.trim();
    const desc = fields.description?.trim();
    return desc ? `Name: ${name}, Description: ${desc}` : (name ?? '');
  }
  return (fields.value ?? '').trim();
}

function normalize(text: string): string {
  return stripRefs(text).replace(/\s{2,}/g, ' ').trim();
}

function SaveBar({ saving, canSave, onSave, onCancel }: { saving: boolean; canSave: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={saving || !canSave} onClick={onSave}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">
        {saving ? <><Loader2 className="size-3.5 animate-spin" /> Saving…</> : <><Check className="size-3.5" /> Save changes</>}
      </button>
      <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-muted">Cancel</button>
    </div>
  );
}

function SkillsEditor({ fact, saving, onSave, onCancel }: {
  fact: Fact; saving: boolean; onSave: (c: { fact_id: string; value: string }[]) => void; onCancel: () => void;
}) {
  const original = [...new Set(stripRefs(fact.value).split(/[,;]/).map((s) => s.trim()).filter(Boolean))];
  const [items, setItems] = useState<string[]>(original);
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const has = (s: string) => items.some((x) => x.toLowerCase() === s.toLowerCase());
  const push = (s: string) => { const v = s.trim().replace(/,+$/, '').trim(); if (v && !has(v)) setItems([...items, v]); setDraft(''); };
  const suggestions = KNOWN_SKILLS.filter((s) => s.toLowerCase().includes(draft.trim().toLowerCase()) && !has(s)).slice(0, 8);
  const value = items.join(', ');
  const canSave = value !== original.join(', ');
  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-2">
          {items.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[12px] font-medium text-foreground/80">
              {s}<button type="button" onClick={() => setItems(items.filter((x) => x !== s))} className="text-muted-foreground hover:text-foreground"><X className="size-3" /></button>
            </span>
          ))}
          <input value={draft} onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => { push(draft); window.setTimeout(() => setFocused(false), 120); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); push(draft); } if (e.key === 'Backspace' && !draft && items.length) setItems(items.slice(0, -1)); }}
            placeholder="Add a skill, press Enter…" className="min-w-[140px] flex-1 bg-transparent px-1 py-0.5 text-[13px] outline-none placeholder:text-muted-foreground" />
        </div>
        {focused && draft.trim() && suggestions.length > 0 && (
          <div className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-pop)]">
            {suggestions.map((s) => (
              <button type="button" key={s} onMouseDown={() => push(s)} className="block w-full rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted">{s}</button>
            ))}
          </div>
        )}
      </div>
      <SaveBar saving={saving} canSave={canSave} onSave={() => onSave([{ fact_id: fact.id, value }])} onCancel={onCancel} />
    </div>
  );
}

function SectionEditor({ kind, facts, saving, onSave, onCancel, onAdd, onDelete, adding, addLabel }: {
  kind: string; facts: Fact[]; saving: boolean;
  onSave: (changes: { fact_id: string; value: string }[]) => void; onCancel: () => void;
  onAdd?: () => void; onDelete?: (factId: string) => void; adding?: boolean; addLabel?: string;
}) {
  const [rows, setRows] = useState(() => facts.map((f) => ({ id: f.id, orig: f.value, key: f.key, fields: factToFields(kind, f) })));
  const defs = FIELD_DEFS[kind];
  const setField = (id: string, k: string, val: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, fields: { ...r.fields, [k]: val } } : r)));
  const changes = rows
    .map((r) => ({ fact_id: r.id, value: fieldsToValue(kind, r.fields) }))
    .filter((c, i) => c.value.trim() && c.value.trim() !== normalize(rows[i].orig));

  const addBtn = onAdd ? (
    <button type="button" onClick={onAdd} disabled={adding}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 disabled:opacity-50">
      {adding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} {addLabel ?? 'Add entry'}
    </button>
  ) : null;

  if (facts.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{onAdd ? 'Nothing here yet — add your first entry.' : 'Nothing to edit here yet — re-upload your resume to extract more.'}</p>
        {addBtn}
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-muted">Close</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="relative space-y-2.5 rounded-xl border border-border bg-muted/20 p-3">
          {onDelete ? (
            <button type="button" onClick={() => onDelete(r.id)} title="Remove"
              className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600">
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
          {defs ? defs.map((d) => (
            <label key={d.k} className="block pr-6">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{d.label}</span>
              {d.k === 'dates'
                ? <MonthYearRange value={r.fields[d.k] ?? ''} onChange={(v) => setField(r.id, d.k, v)} currentLabel={kind === 'education' ? 'Currently studying here' : 'Currently ongoing'} />
                : d.ta
                ? <textarea value={r.fields[d.k] ?? ''} onChange={(e) => setField(r.id, d.k, e.target.value)} rows={4} className={FIELD_INPUT + ' resize-y'} />
                : <input value={r.fields[d.k] ?? ''} onChange={(e) => setField(r.id, d.k, e.target.value)} className={FIELD_INPUT} />}
            </label>
          )) : (
            <label className="block pr-6">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{kind === 'summary' ? 'Summary' : prettyKey(r.key)}</span>
              <textarea value={r.fields.value ?? ''} onChange={(e) => setField(r.id, 'value', e.target.value)} rows={kind === 'summary' ? 6 : 2} className={FIELD_INPUT + ' resize-y'} />
            </label>
          )}
        </div>
      ))}
      {addBtn}
      <SaveBar saving={saving} canSave={changes.length > 0} onSave={() => onSave(changes)} onCancel={onCancel} />
    </div>
  );
}

function ExperienceItem({ role, last, onEdit, onDelete }: { role: ParsedRole; last: boolean; onEdit?: () => void; onDelete?: () => void }) {
  const [open, setOpen] = useState(false);
  const shown = open ? role.bullets : role.bullets.slice(0, 3);
  const extra = role.bullets.length - shown.length;
  return (
    <div className="group/entry relative flex gap-3">
      {(onEdit || onDelete) ? (
        <div className="absolute right-0 top-0 flex gap-1 opacity-0 transition-opacity group-hover/entry:opacity-100">
          {onEdit ? <button type="button" onClick={onEdit} title="Edit" className="flex size-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-3" /></button> : null}
          {onDelete ? <button type="button" onClick={onDelete} title="Remove" className="flex size-6 items-center justify-center rounded-md border border-border bg-card text-rose-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="size-3" /></button> : null}
        </div>
      ) : null}
      {/* timeline rail: avatar + connecting line that stretches to the next item */}
      <div className="flex flex-col items-center">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{initials(role.company ?? role.title)}</span>
        {!last ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
      </div>
      <div className={'min-w-0 flex-1 pr-14 ' + (last ? '' : 'pb-5')}>
        <p className="text-sm font-semibold text-foreground">{role.title}</p>
        <p className="text-[13px] text-muted-foreground">{role.company}{role.dates ? <span className="text-muted-foreground/70"> · {role.dates}</span> : null}</p>
        {shown.length ? (
          <ul className="mt-1.5 space-y-1">
            {shown.map((b, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-snug text-foreground/90"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />{b}</li>
            ))}
          </ul>
        ) : null}
        {extra > 0 || open ? (
          <button onClick={() => setOpen((o) => !o)} className="mt-1.5 text-[12px] font-medium text-primary hover:underline">
            {open ? 'Show less' : `+${extra} more bullet${extra === 1 ? '' : 's'}`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ----------------------------- application defaults ----------------------------- */

type Defaults = {
  // work authorization
  workCountry: string; visaType: string; authorized: boolean | null; sponsorship: boolean | null; over18: boolean | null;
  // work preferences
  inPerson: boolean | null; remote: boolean | null; relocate: boolean | null; travel: boolean | null; startNow: boolean | null;
  noticePeriod: string; desiredSalary: string; earliestStart: string;
  // voluntary self-ID
  gender: string; ethnicity: string; pronouns: string; veteran: boolean | null; disability: boolean | null;
  // additional
  priorEmployee: boolean | null; source: string;
};
const EMPTY_DEFAULTS: Defaults = {
  workCountry: '', visaType: '', authorized: null, sponsorship: null, over18: null,
  inPerson: null, remote: null, relocate: null, travel: null, startNow: null,
  noticePeriod: '', desiredSalary: '', earliestStart: '',
  gender: '', ethnicity: '', pronouns: '', veteran: null, disability: null,
  priorEmployee: null, source: '',
};

function TriChip({ value, label, editing, onCycle }: { value: boolean | null; label: string; editing: boolean; onCycle: () => void }) {
  const tone = value === true ? 'bg-primary/10 text-primary' : value === false ? 'bg-muted text-muted-foreground line-through decoration-1' : 'border border-dashed border-border text-muted-foreground';
  const Icon = value === true ? Check : value === false ? X : Plus;
  return (
    <button type="button" disabled={!editing} onClick={onCycle}
      className={'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ' + tone + (editing ? ' cursor-pointer hover:brightness-95' : ' cursor-default')}>
      <Icon className="size-3" /> {label}
    </button>
  );
}

type Contact = { mobile: string; email: string; address: string; city: string; country: string; zipcode: string };
const CONTACT_FIELDS: { k: keyof Contact; label: string }[] = [
  { k: 'mobile', label: 'Mobile' },
  { k: 'email', label: 'Email' },
  { k: 'address', label: 'Address' },
  { k: 'city', label: 'City' },
  { k: 'country', label: 'Country' },
  { k: 'zipcode', label: 'Zip code' },
];

const EMPTY_CONTACT: Contact = { mobile: '', email: '', address: '', city: '', country: '', zipcode: '' };

function ContactCard({ value, onSave, saving }: { value: Contact; onSave: (c: Contact) => void; saving: boolean }) {
  const c = { ...EMPTY_CONTACT, ...value };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Contact>(c);
  const lbl = 'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground';
  const open = () => { setDraft({ ...EMPTY_CONTACT, ...value }); setEditing(true); };
  return (
    <SectionCard icon={Phone} tone="bg-primary/10 text-primary" title="Contact details" sub="How employers reach you."
      action={<HeaderEditBtn active={editing} onClick={() => (editing ? setEditing(false) : open())} />}>
      {editing ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {CONTACT_FIELDS.map((f) => (
            <label key={f.k} className={f.k === 'address' ? 'block sm:col-span-2' : 'block'}>
              <span className={lbl}>{f.label}</span>
              {f.k === 'country'
                ? <div className="mt-1"><Combobox value={draft.country} onChange={(v) => setDraft({ ...draft, country: v })} options={COUNTRIES} placeholder="Country" /></div>
                : <input value={draft[f.k]} onChange={(e) => setDraft({ ...draft, [f.k]: e.target.value })} placeholder={f.label} className={FIELD_INPUT} />}
            </label>
          ))}
          <div className="sm:col-span-2">
            <button type="button" disabled={saving} onClick={() => { onSave(draft); setEditing(false); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-x-4 gap-y-2 text-[13px] sm:grid-cols-2">
          {CONTACT_FIELDS.map((f) => (
            <div key={f.k} className={f.k === 'address' ? 'sm:col-span-2' : ''}>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{f.label}</span>
              <p className="text-foreground">{c[f.k]?.trim() || <span className="text-muted-foreground">Not set</span>}</p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function AppDefaultsCard({ value, onSave, saving }: { value: Partial<Defaults>; onSave: (d: Defaults) => void; saving: boolean }) {
  const merged = { ...EMPTY_DEFAULTS, ...value };
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState<Defaults>(merged);
  const view = editing ? d : merged;
  const cycle = (k: keyof Defaults) => setD((cur) => ({ ...cur, [k]: cur[k] === null ? true : cur[k] === true ? false : null }));
  const open = () => { setD({ ...EMPTY_DEFAULTS, ...value }); setEditing(true); };
  const shown = (k: keyof Defaults) => <span className="text-[11px] font-medium text-foreground">{(view[k] as string) || <span className="text-muted-foreground">Not set</span>}</span>;
  const text = (k: keyof Defaults, label: string) => (
    editing
      ? <input value={(d[k] as string) ?? ''} onChange={(e) => setD({ ...d, [k]: e.target.value })} placeholder={label}
          className="w-32 rounded-md border border-border bg-card px-2 py-0.5 text-[11px] outline-none focus:ring-2 focus:ring-[var(--ring)]" />
      : shown(k)
  );
  const combo = (k: keyof Defaults, label: string, options: string[]) => (
    editing
      ? <span className="inline-block w-44 align-middle"><Combobox value={(d[k] as string) ?? ''} onChange={(v) => setD({ ...d, [k]: v })} options={options} placeholder={label} className="h-7 py-1 text-[11px]" /></span>
      : shown(k)
  );
  const pick = combo;
  return (
    <SectionCard icon={IdCard} tone="bg-primary/10 text-primary" title="Application answers" sub="Standard questions employers ask — auto-filled on every application."
      action={<HeaderEditBtn active={editing} onClick={() => (editing ? setEditing(false) : open())} />}>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Work authorization</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">Work country: {combo('workCountry', 'Country', COUNTRIES)}</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">Visa type: {pick('visaType', 'Visa type', VISA_TYPES)}</span>
            <TriChip value={view.authorized} label="Authorized to work" editing={editing} onCycle={() => cycle('authorized')} />
            <TriChip value={view.sponsorship} label="Needs sponsorship" editing={editing} onCycle={() => cycle('sponsorship')} />
            <TriChip value={view.over18} label="18 or older" editing={editing} onCycle={() => cycle('over18')} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Work preferences</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <TriChip value={view.inPerson} label="In-person OK" editing={editing} onCycle={() => cycle('inPerson')} />
            <TriChip value={view.remote} label="Open to remote" editing={editing} onCycle={() => cycle('remote')} />
            <TriChip value={view.relocate} label="Can relocate" editing={editing} onCycle={() => cycle('relocate')} />
            <TriChip value={view.travel} label="Willing to travel" editing={editing} onCycle={() => cycle('travel')} />
            <TriChip value={view.startNow} label="Start immediately" editing={editing} onCycle={() => cycle('startNow')} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">Notice period: {pick('noticePeriod', 'Notice period', NOTICE_PERIODS)}</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">Desired salary: {text('desiredSalary', 'e.g. $150k')}</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">Earliest start: {pick('earliestStart', 'Earliest start', EARLIEST_START)}</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Voluntary self-ID</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">Gender: {combo('gender', 'Gender', GENDERS)}</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">Pronouns: {pick('pronouns', 'Pronouns', PRONOUNS)}</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">Ethnicity: {combo('ethnicity', 'Ethnicity', ETHNICITIES)}</span>
            <TriChip value={view.veteran} label="Veteran" editing={editing} onCycle={() => cycle('veteran')} />
            <TriChip value={view.disability} label="Disability" editing={editing} onCycle={() => cycle('disability')} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Additional</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <TriChip value={view.priorEmployee} label="Previously employed here" editing={editing} onCycle={() => cycle('priorEmployee')} />
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">Heard about us via: {pick('source', 'Source', SOURCES)}</span>
          </div>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <button type="button" disabled={saving} onClick={() => { onSave(d); setEditing(false); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save
            </button>
            <span className="text-[11px] text-muted-foreground">Tap a chip to cycle unset → yes → no.</span>
          </div>
        ) : <p className="text-[11px] text-muted-foreground">Set these once and Pathway fills them on every application.</p>}
      </div>
    </SectionCard>
  );
}

function ExperienceEditor({ facts, saving, onSave, onCancel, onAdd, onDeleteRole, adding, titleOptions = [] }: {
  facts: Fact[]; saving: boolean;
  onSave: (changes: { fact_id: string; value: string }[]) => void; onCancel: () => void;
  onAdd?: () => void; onDeleteRole?: (factIds: string[]) => void; adding?: boolean; titleOptions?: string[];
}) {
  const [roles, setRoles] = useState(() => groupExperienceEditable(facts).map((r) => ({ ...r, highlights: r.bullets.join('\n') })));
  const orig = Object.fromEntries(facts.map((f) => [f.id, f.value]));
  const set = (i: number, k: 'company' | 'title' | 'dates' | 'highlights', v: string) =>
    setRoles((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  // Consolidate each role into its primary fact; blank the leftover facts so
  // the highlights aren't duplicated.
  const changes: { fact_id: string; value: string }[] = [];
  for (const r of roles) {
    changes.push({ fact_id: r.primaryId, value: fieldsToValue('experience', { company: r.company, title: r.title, dates: r.dates, details: r.highlights }) });
    for (const id of r.factIds) if (id !== r.primaryId) changes.push({ fact_id: id, value: '' });
  }
  const dirty = changes.filter((c) => c.value.trim() !== normalize(orig[c.fact_id] ?? ''));

  const lbl = 'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground';
  const addBtn = onAdd ? (
    <button type="button" onClick={onAdd} disabled={adding}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 disabled:opacity-50">
      {adding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Add experience
    </button>
  ) : null;

  if (facts.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Nothing here yet — add your first role.</p>
        {addBtn}
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-muted">Close</button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {roles.map((r, i) => (
        <div key={r.primaryId} className="relative space-y-2.5 rounded-xl border border-border bg-muted/20 p-3">
          {onDeleteRole ? (
            <button type="button" onClick={() => onDeleteRole(r.factIds)} title="Remove role"
              className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600">
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
          <label className="block pr-6"><span className={lbl}>Company</span><input value={r.company} onChange={(e) => set(i, 'company', e.target.value)} className={FIELD_INPUT} /></label>
          <div className="pr-6"><span className={lbl}>Title</span><div className="mt-1"><Combobox value={r.title} onChange={(v) => set(i, 'title', v)} options={titleOptions} placeholder="e.g. Senior Frontend Engineer" /></div></div>
          <div><span className={lbl}>Dates</span><MonthYearRange value={r.dates} onChange={(v) => set(i, 'dates', v)} currentLabel="I currently work here" /></div>
          <label className="block"><span className={lbl}>Highlights (one per line)</span>
            <textarea value={r.highlights} onChange={(e) => set(i, 'highlights', e.target.value)}
              rows={Math.min(12, Math.max(3, r.highlights.split('\n').length + 1))} className={FIELD_INPUT + ' resize-y'} /></label>
        </div>
      ))}
      {addBtn}
      <SaveBar saving={saving} canSave={dirty.length > 0} onSave={() => onSave(dirty)} onCancel={onCancel} />
    </div>
  );
}

/* ----------------------------- social links ----------------------------- */

// lucide dropped brand marks, so use inline SVGs for the social logos.
const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 .1.8 1.3 1.6 1 .1-.7.4-1.2.7-1.5-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5Z" /></svg>
);
const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" /></svg>
);
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.22-6.82-5.97 6.82H1.66l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.05l12.03 15.64Z" /></svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
);
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" /></svg>
);

type Socials = { linkedin: string; github: string; twitter: string; telegram: string; discord: string; website: string };
const SOCIAL_DEFS: { k: keyof Socials; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { k: 'linkedin', label: 'LinkedIn', icon: LinkedinIcon },
  { k: 'github', label: 'GitHub', icon: GithubIcon },
  { k: 'twitter', label: 'Twitter / X', icon: TwitterIcon },
  { k: 'telegram', label: 'Telegram', icon: TelegramIcon },
  { k: 'discord', label: 'Discord', icon: DiscordIcon },
  { k: 'website', label: 'Website', icon: Globe },
];

function normalizeUrl(u: string): string {
  const t = u.trim();
  if (!t) return '';
  return /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, '')}`;
}

const EMPTY_SOCIALS: Socials = { linkedin: '', github: '', twitter: '', telegram: '', discord: '', website: '' };

function SocialLinks({ value, onSave, saving }: { value: Socials; onSave: (s: Socials) => void; saving: boolean }) {
  const socials = { ...EMPTY_SOCIALS, ...value };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Socials>(socials);
  const anySet = SOCIAL_DEFS.some((d) => socials[d.k]?.trim());
  const open = () => { setDraft({ ...EMPTY_SOCIALS, ...value }); setEditing(true); };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        {SOCIAL_DEFS.filter((d) => socials[d.k]?.trim()).map((d) => (
          <a key={d.k} href={normalizeUrl(socials[d.k])} target="_blank" rel="noopener noreferrer" title={d.label}
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary">
            <d.icon className="size-4" />
          </a>
        ))}
        <button type="button" onClick={() => (editing ? setEditing(false) : open())} title={anySet ? 'Edit links' : 'Add social links'}
          className="flex h-8 items-center gap-1 rounded-lg border border-dashed border-border px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
          {anySet ? <Pencil className="size-3.5" /> : <><Plus className="size-3.5" /> Add links</>}
        </button>
      </div>

      {editing ? (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-20" onClick={() => setEditing(false)} />
          {/* overlay panel — absolutely positioned so it never shifts the page */}
          <div className="absolute left-0 top-full z-30 mt-2 w-[360px] space-y-2 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-pop)]">
            {SOCIAL_DEFS.map((d) => (
              <label key={d.k} className="flex items-center gap-2">
                <d.icon className="size-4 shrink-0 text-muted-foreground" />
                <input value={draft[d.k]} onChange={(e) => setDraft({ ...draft, [d.k]: e.target.value })} placeholder={`${d.label} URL`}
                  className="w-full rounded-md border border-border bg-card px-2 py-1 text-[13px] outline-none focus:ring-2 focus:ring-[var(--ring)]" />
              </label>
            ))}
            <button type="button" disabled={saving} onClick={() => { onSave(draft); setEditing(false); }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">{saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Done</button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ----------------------------- custom sections ----------------------------- */

type CustomSection = { id: string; title: string; body: string };

function CustomSections({ value, onSave }: { value: CustomSection[]; onSave: (v: CustomSection[]) => void }) {
  const [sections, setSections] = useState<CustomSection[]>(value);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Resync from the backend when it changes (e.g. after a save elsewhere).
  useEffect(() => { setSections(value); }, [value]);

  const add = () => {
    const section: CustomSection = { id: `cs_${Math.random().toString(36).slice(2, 9)}`, title: '', body: '' };
    const next = [...sections, section];
    setSections(next);
    onSave(next);
    setEditingId(section.id);
  };
  const patch = (id: string, change: Partial<CustomSection>) => setSections(sections.map((s) => (s.id === id ? { ...s, ...change } : s)));
  const remove = (id: string) => { const next = sections.filter((s) => s.id !== id); setSections(next); onSave(next); setEditingId(null); };

  return (
    <>
      {sections.map((s) => (
        <SectionCard
          key={s.id}
          icon={ListPlus}
          tone="bg-primary/10 text-primary"
          title={s.title.trim() || 'Untitled section'}
          action={<HeaderEditBtn active={editingId === s.id} onClick={() => setEditingId(editingId === s.id ? null : s.id)} />}
        >
          {editingId === s.id ? (
            <div className="space-y-3">
              <input
                value={s.title}
                onChange={(e) => patch(s.id, { title: e.target.value })}
                placeholder="Section title (e.g. Publications, Volunteering)"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              <textarea
                value={s.body}
                onChange={(e) => patch(s.id, { body: e.target.value })}
                rows={4}
                placeholder="Add details…"
                className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-[13px] leading-relaxed outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { onSave(sections); setEditingId(null); }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground hover:bg-[var(--primary-hover)]"><Check className="size-3.5" /> Done</button>
                <button type="button" onClick={() => remove(s.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-rose-600 hover:bg-rose-50"><Trash2 className="size-3.5" /> Delete</button>
              </div>
            </div>
          ) : (
            s.body.trim()
              ? <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">{s.body}</p>
              : <p className="text-sm text-muted-foreground">Empty section — click Edit to add details.</p>
          )}
        </SectionCard>
      ))}
      <button type="button" onClick={add} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40">
        <Plus className="size-4" /> Add custom section
      </button>
    </>
  );
}

/* ----------------------------- completeness ----------------------------- */

type CompletenessItem = { label: string; ok: boolean; weight: number; required: boolean };

function computeCompleteness(p: BackendProfile): { percent: number; items: CompletenessItem[]; missingRequired: string[] } {
  const has = (c: string) => p.facts.some((f) => f.category === c);
  const contact = p.contact ?? {};
  const ad = p.application_defaults ?? {};
  const workAuth = ad.authorized != null || String(ad.visaType ?? '').trim() !== '' || String(ad.workCountry ?? '').trim() !== '';
  const items: CompletenessItem[] = [
    { label: 'Contact info', ok: !!(String(contact.mobile ?? '').trim() && String(contact.email ?? '').trim()), weight: 20, required: true },
    { label: 'Experience', ok: has('experience'), weight: 20, required: true },
    { label: 'Education', ok: has('education'), weight: 15, required: true },
    { label: 'Summary', ok: has('professional_summary'), weight: 15, required: true },
    { label: 'Work authorization', ok: workAuth, weight: 15, required: true },
    { label: 'Skills', ok: has('skills'), weight: 5, required: false },
    { label: 'Projects', ok: has('project'), weight: 4, required: false },
    { label: 'Certifications', ok: has('certifications'), weight: 3, required: false },
    { label: 'Social links', ok: Object.values(p.socials ?? {}).some((v) => String(v).trim()), weight: 3, required: false },
  ];
  const percent = items.reduce((sum, i) => sum + (i.ok ? i.weight : 0), 0);
  return { percent, items, missingRequired: items.filter((i) => i.required && !i.ok).map((i) => i.label) };
}

function ProfileStrengthCard({ percent, items }: { percent: number; items: CompletenessItem[] }) {
  const label = percent < 40 ? 'Getting started' : percent < 70 ? 'Good progress' : percent < 100 ? 'Strong profile' : 'Complete';
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-4.5" /></span>
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Profile strength</h2>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
          </div>
        </div>
        <span className="text-[22px] font-bold leading-none tracking-[-0.02em] text-primary">{percent}%</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
      <ul className="mt-4 space-y-1.5">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2 text-[13px]">
            {i.ok
              ? <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-2.5" /></span>
              : <span className="size-4 shrink-0 rounded-full border border-dashed border-muted-foreground/40" />}
            <span className={i.ok ? 'text-muted-foreground' : 'font-medium text-foreground'}>{i.label}</span>
            {!i.required ? <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">optional</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ----------------------------- profile view ----------------------------- */

function TitleEditor({ initial, options, saving, onSave, onCancel }: { initial: string; options: string[]; saving: boolean; onSave: (v: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState(initial);
  return (
    <span className="inline-flex items-center gap-1.5">
      <div className="w-72 max-w-full">
        <Combobox value={val} onChange={setVal} options={options} placeholder="e.g. Senior Frontend Engineer" className="text-[14px]" />
      </div>
      <button type="button" onClick={() => onSave(val)} disabled={saving} title="Save" className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">
        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
      </button>
      <button type="button" onClick={onCancel} disabled={saving} title="Cancel" className="grid size-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted"><X className="size-3.5" /></button>
    </span>
  );
}

function SkelLine({ w = 'w-full', h = 'h-3' }: { w?: string; h?: string }) {
  return <div className={`${h} ${w} rounded bg-muted animate-pulse`} />;
}

function SkelCard({ lines }: { lines: number }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <div className="size-9 shrink-0 rounded-xl bg-muted animate-pulse" />
        <SkelLine w="w-40" h="h-4" />
      </div>
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => <SkelLine key={i} w={i === lines - 1 ? 'w-2/3' : 'w-full'} />)}
      </div>
    </section>
  );
}

function ProfileParsingSkeleton({ name, filename }: { name: string; filename: string | null }) {
  return (
    <div className="w-full">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"><FolderOpen className="size-3" /> {name}</span>
        <div className="mt-2 h-7 w-56 rounded bg-muted animate-pulse" />
        <div className="mt-2.5 h-3.5 w-72 rounded bg-muted animate-pulse" />
        {filename ? (
          <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[12px] text-muted-foreground" title={filename}>
            <FileText className="size-3.5 shrink-0 text-primary" /> <span className="truncate">{filename}</span>
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[13px] font-medium text-primary">
        <Loader2 className="size-4 animate-spin" /> Extracting your resume — this takes a moment, sections will fill in automatically…
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-4 order-2">
          <SkelCard lines={5} />
          <SkelCard lines={4} />
          <SkelCard lines={4} />
        </div>
        <div className="space-y-4 order-1">
          <SkelCard lines={4} />
          <SkelCard lines={5} />
          <SkelCard lines={3} />
        </div>
      </div>
    </div>
  );
}

function ProfileView({ profileId }: { profileId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const parsing = useIsParsing(profileId);
  const profileQ = useQuery({
    queryKey: profileQueryKey(profileId),
    queryFn: () => getProfile(profileId),
    refetchInterval: parsing ? 1500 : false,
  });

  const factsMut = useMutation({
    mutationFn: (changes: { fact_id: string; value: string }[]) =>
      verifyProfileFacts(profileId, { facts: changes.map((c) => ({ fact_id: c.fact_id, value: c.value, verified: true })) }),
    onSuccess: (updated) => { queryClient.setQueryData(profileQueryKey(profileId), updated); setEditing(null); },
  });
  const addFactMut = useMutation({
    mutationFn: (tpl: { category: string; key: string; value: string }) => addProfileFact(profileId, tpl),
    onSuccess: (updated) => queryClient.setQueryData(profileQueryKey(profileId), updated),
  });
  const deleteFactMut = useMutation({
    mutationFn: async (ids: string | string[]) => {
      const list = Array.isArray(ids) ? ids : [ids];
      let updated = null;
      for (const id of list) updated = await deleteProfileFact(profileId, id);
      return updated;
    },
    onSuccess: (updated) => { if (updated) queryClient.setQueryData(profileQueryKey(profileId), updated); },
  });
  const updateProfileMut = useMutation({
    mutationFn: (patch: ProfileUpdate) => updateProfile(profileId, patch),
    onSuccess: (updated) => queryClient.setQueryData(profileQueryKey(profileId), updated),
  });

  // One-time migration of any pre-existing browser-local values into the backend.
  useEffect(() => {
    const prof = profileQ.data;
    if (!prof) return;
    const keys = ['pcontact', 'pdef', 'psocial', 'pcustom', 'pimg'].map((k) => `job-copilot.${k}.${profileId}`);
    if (!keys.some((k) => window.localStorage.getItem(k) != null)) return;
    const read = (name: string) => { try { const r = window.localStorage.getItem(`job-copilot.${name}.${profileId}`); return r ? JSON.parse(r) : null; } catch { return null; } };
    const empty = (o: unknown) => !o || (typeof o === 'object' && Object.values(o as object).every((v) => !v || (typeof v === 'string' && !v.trim())));
    const patch: ProfileUpdate = {};
    const contact = read('pcontact'); if (contact && empty(prof.contact)) patch.contact = contact;
    const def = read('pdef'); if (def && empty(prof.application_defaults)) patch.application_defaults = def;
    const soc = read('psocial'); if (soc && empty(prof.socials)) patch.socials = soc;
    const cust = read('pcustom'); if (Array.isArray(cust) && cust.length && !(prof.custom_sections ?? []).length) patch.custom_sections = cust;
    keys.forEach((k) => window.localStorage.removeItem(k));
    if (Object.keys(patch).length) updateProfile(profileId, patch).then((u) => queryClient.setQueryData(profileQueryKey(profileId), u)).catch(() => { /* ignore */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileQ.data, profileId]);

  if (profileQ.isLoading) return <div className="grid min-h-[300px] place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (profileQ.isError || !profileQ.data) {
    return (
      <div className="grid min-h-[300px] place-items-center text-center">
        <div>
          <p className="text-sm font-medium text-foreground">Couldn’t load your profile</p>
          <button onClick={() => clearActiveProfileId()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-muted"><RefreshCw className="size-3.5" /> Start over</button>
        </div>
      </div>
    );
  }

  // While the resume is still being extracted and nothing has landed yet, show
  // shimmering section skeletons instead of an empty page or a blank spinner.
  if (parsing && profileQ.data.facts.length === 0) {
    return <ProfileParsingSkeleton name={profileQ.data.display_name} filename={profileQ.data.source_filename} />;
  }

  const p = profileQ.data;
  const byCat = (c: string) => p.facts.filter((f) => f.category === c);
  const factById = Object.fromEntries(p.facts.map((f) => [f.id, f]));
  const titleFact = byCat('identity').find((f) => f.key === 'current_title');
  const currentTitle = titleFact?.value;
  const personName = personNameOf(p);
  const summaryFacts = byCat('professional_summary');
  const summary = summaryFacts[0]?.value;
  const experienceFacts = byCat('experience');
  const roles = groupExperienceEditable(experienceFacts);
  const titleOptions = [...new Set([...roles.map((r) => r.title), currentTitle, ...COMMON_TITLES].filter((t): t is string => !!t && t.trim().length > 0))];
  const educationFacts = byCat('education');
  // Expand any multi-degree fact into one display entry per degree.
  const eduEntries = educationFacts.flatMap((f) => {
    const segs = splitEducationValue(f.value);
    return segs.map((seg, i) => ({ f, seg, i, count: segs.length }));
  });
  const projectFacts = byCat('project');
  const certFacts = byCat('certifications');
  const skillFacts = byCat('skills');
  const skills = [...new Set(
    skillFacts.flatMap((f) => f.value.split(/[,;•|]/).map((s) => s.trim())).filter(isSkillToken),
  )];
  const skillGroups = categorizeSkills(skills);
  const completeness = computeCompleteness(p);

  const ADD_TEMPLATES: Record<string, { category: string; key: string; value: string; prefix: string }> = {
    experience: { category: 'experience', key: 'experience', value: 'Company: New company, Title: New role, Dates: TBD', prefix: 'exp' },
    education: { category: 'education', key: 'education', value: 'New institution - New degree', prefix: 'edu' },
    projects: { category: 'project', key: 'project', value: 'Name: New project, Description: Describe this project.', prefix: 'proj' },
    certifications: { category: 'certifications', key: 'certification', value: 'New certification', prefix: 'cert' },
  };
  // Add a new entry, then open it for editing straight away.
  const handleAdd = (kind: keyof typeof ADD_TEMPLATES) => {
    const before = new Set(p.facts.map((f) => f.id));
    const tpl = ADD_TEMPLATES[kind];
    addFactMut.mutate({ category: tpl.category, key: tpl.key, value: tpl.value }, {
      onSuccess: (updated) => {
        const fresh = updated.facts.find((f) => !before.has(f.id));
        if (fresh) setEditing(`${tpl.prefix}:${fresh.id}`);
      },
    });
  };

  // Single-entry editors (per element rather than per section).
  const common = { saving: factsMut.isPending, onSave: (c: { fact_id: string; value: string }[]) => factsMut.mutate(c), onCancel: () => setEditing(null) };
  const factEditor = (kind: string, facts: Fact[]) => <SectionEditor kind={kind} facts={facts} {...common} />;
  const roleEditor = (facts: Fact[]) => <ExperienceEditor facts={facts} titleOptions={titleOptions} {...common} />;

  // Edit/delete a single degree inside a (possibly multi-degree) education fact by
  // rewriting just that segment back into the fact's value.
  const eduSegmentEditor = (f: Fact, i: number, seg: string) => (
    <SectionEditor kind="education" facts={[{ ...f, value: seg }]} saving={factsMut.isPending} onCancel={() => setEditing(null)}
      onSave={(changes) => {
        const segs = splitEducationValue(f.value);
        segs[i] = changes[0]?.value ?? seg;
        factsMut.mutate([{ fact_id: f.id, value: segs.join('. ') }]);
      }} />
  );
  const deleteEduSegment = (f: Fact, i: number, count: number) => {
    if (count <= 1) { deleteFactMut.mutate(f.id); return; }
    const segs = splitEducationValue(f.value);
    segs.splice(i, 1);
    factsMut.mutate([{ fact_id: f.id, value: segs.join('. ') }]);
  };

  return (
    <div className="w-full">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"><FolderOpen className="size-3" /> {p.display_name}</span>
        <h1 className="mt-1.5 text-[26px] font-bold tracking-[-0.02em] text-foreground">{personName ? stripRefs(personName) : p.display_name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {editing === 'title' ? (
            <TitleEditor initial={currentTitle ? stripRefs(currentTitle) : ''} options={titleOptions} saving={factsMut.isPending || addFactMut.isPending}
              onCancel={() => setEditing(null)}
              onSave={(val) => {
                const v = val.trim();
                if (!v) { setEditing(null); return; }
                if (titleFact) factsMut.mutate([{ fact_id: titleFact.id, value: v }]);
                else addFactMut.mutate({ category: 'identity', key: 'current_title', value: v }, { onSuccess: () => setEditing(null) });
              }} />
          ) : currentTitle ? (
            <button type="button" onClick={() => setEditing('title')} title="Edit title"
              className="group/title inline-flex items-center gap-1.5 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              {stripRefs(currentTitle)}
              <Pencil className="size-3 opacity-0 transition-opacity group-hover/title:opacity-100" />
            </button>
          ) : (
            <button type="button" onClick={() => setEditing('title')}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-0.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
              <Plus className="size-3.5" /> Add title
            </button>
          )}
          <SocialLinks value={p.socials as Socials} onSave={(s) => updateProfileMut.mutate({ socials: s })} saving={updateProfileMut.isPending} />
        </div>
        {p.source_filename ? (
          <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[12px] text-muted-foreground" title={p.source_filename}>
            <FileText className="size-3.5 shrink-0 text-primary" /> <span className="truncate">{p.source_filename}</span>
          </span>
        ) : null}
      </div>

      {/* profile details — main left, sidebar right */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* sidebar column (now right) */}
        <div className="space-y-4 order-2">
          <ProfileStrengthCard percent={completeness.percent} items={completeness.items} />

          <ContactCard value={p.contact as Contact} onSave={(c) => updateProfileMut.mutate({ contact: c })} saving={updateProfileMut.isPending} />

          <AppDefaultsCard value={p.application_defaults as Partial<Defaults>} onSave={(d) => updateProfileMut.mutate({ application_defaults: d })} saving={updateProfileMut.isPending} />

          <SectionCard icon={Code2} tone="bg-primary/10 text-primary" title="Skills" sub={`${skills.length} skills across ${skillGroups.length} categories`}
            action={skillFacts.length > 0 ? <HeaderEditBtn active={editing === 'skills'} onClick={() => setEditing((e) => (e === 'skills' ? null : 'skills'))} /> : undefined}>
            {editing === 'skills' && skillFacts.length > 0 ? <SkillsEditor fact={skillFacts[0]} {...common} /> : skills.length === 0 ? <p className="text-sm text-muted-foreground">No skills extracted yet.</p> : (
              <div className="space-y-3">
                {skillGroups.map((g) => (
                  <div key={g.label}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{g.label}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {g.items.map((s) => <span key={s} className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{s}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={Award} tone="bg-primary/10 text-primary" title="Certifications" sub={certFacts.length ? `${certFacts.length} ${certFacts.length === 1 ? 'credential' : 'credentials'}` : undefined}
            action={<HeaderAddBtn onClick={() => handleAdd('certifications')} loading={addFactMut.isPending} />}>
            {certFacts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-3 py-6 text-center">
                <Link2 className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-2 text-[13px] text-muted-foreground">Add credentials, badges, or licenses.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {certFacts.map((f) => editing === `cert:${f.id}` ? factEditor('certifications', [f])
                  : <EntryRow key={f.id} onEdit={() => setEditing(`cert:${f.id}`)} onDelete={() => deleteFactMut.mutate(f.id)}><p className="text-[13px] text-foreground">{stripRefs(f.value)}</p></EntryRow>)}
              </div>
            )}
          </SectionCard>
        </div>

        {/* main column (now left) */}
        <div className="space-y-4 order-1">
          <SectionCard icon={FileText} tone="bg-primary/10 text-primary" title="Professional summary"
            action={summaryFacts.length > 0 ? <HeaderEditBtn active={editing === 'summary'} onClick={() => setEditing((e) => (e === 'summary' ? null : 'summary'))} /> : undefined}>
            {editing === 'summary' ? factEditor('summary', summaryFacts)
              : summary ? <p className="text-[13px] leading-relaxed text-foreground/90">{stripRefs(summary)}</p>
              : <p className="text-sm text-muted-foreground">Add a professional summary, the first thing recruiters read.</p>}
          </SectionCard>

          <SectionCard icon={Briefcase} tone="bg-primary/10 text-primary" title="Experience" sub={`${roles.length} ${roles.length === 1 ? 'role' : 'roles'}`}
            action={<HeaderAddBtn onClick={() => handleAdd('experience')} loading={addFactMut.isPending} />}>
            {roles.length === 0 ? <p className="text-sm text-muted-foreground">No experience yet — use Add.</p> : (
              <div>
                {roles.map((role, i) => editing === `exp:${role.primaryId}`
                  ? <div key={role.primaryId} className="pb-3">{roleEditor(role.factIds.map((id) => factById[id]).filter(Boolean))}</div>
                  : <ExperienceItem key={role.primaryId} role={role} last={i === roles.length - 1}
                      onEdit={() => setEditing(`exp:${role.primaryId}`)} onDelete={() => deleteFactMut.mutate(role.factIds)} />)}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={Rocket} tone="bg-primary/10 text-primary" title="Projects" sub={`${projectFacts.length} ${projectFacts.length === 1 ? 'project' : 'projects'}`}
            action={<HeaderAddBtn onClick={() => handleAdd('projects')} loading={addFactMut.isPending} />}>
            {projectFacts.length === 0 ? <p className="text-sm text-muted-foreground">No projects yet — use Add.</p> : (
              <div className="space-y-2">
                {projectFacts.map((f) => {
                  if (editing === `proj:${f.id}`) return factEditor('projects', [f]);
                  const proj = parseProject(f);
                  return (
                    <EntryRow key={f.id} onEdit={() => setEditing(`proj:${f.id}`)} onDelete={() => deleteFactMut.mutate(f.id)}>
                      <p className="text-sm font-semibold text-foreground">{proj.name}</p>
                      {proj.desc ? <p className="text-[13px] leading-relaxed text-muted-foreground">{proj.desc}</p> : null}
                    </EntryRow>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={GraduationCap} tone="bg-primary/10 text-primary" title="Education" sub={`${eduEntries.length} ${eduEntries.length === 1 ? 'entry' : 'entries'}`}
            action={<HeaderAddBtn onClick={() => handleAdd('education')} loading={addFactMut.isPending} />}>
            {eduEntries.length === 0 ? <p className="text-sm text-muted-foreground">No education added yet — use Add.</p> : (
              <div className="space-y-2">
                {eduEntries.map(({ f, seg, i, count }) => {
                  const key = `${f.id}#${i}`;
                  if (editing === `edu:${key}`) return <div key={key}>{eduSegmentEditor(f, i, seg)}</div>;
                  const e = parseEducation({ ...f, value: seg });
                  return (
                    <EntryRow key={key} onEdit={() => setEditing(`edu:${key}`)} onDelete={() => deleteEduSegment(f, i, count)}>
                      <div className="flex items-start gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-bold text-foreground/70">{initials(e.institution)}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{e.institution}</p>
                          {e.degree ? <p className="text-[13px] text-muted-foreground">{e.degree}</p> : null}
                          {e.dates ? <p className="text-[12px] text-muted-foreground/80">{e.dates}</p> : null}
                        </div>
                      </div>
                    </EntryRow>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <CustomSections value={p.custom_sections} onSave={(cs) => updateProfileMut.mutate({ custom_sections: cs })} />
        </div>
      </div>

      {factsMut.isError ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{factsMut.error instanceof BackendError ? factsMut.error.message : 'Could not save changes.'}</p> : null}
    </div>
  );
}

/* ----------------------------- profiles listing ----------------------------- */

function ProfileGridCard({
  profile, onOpen, onRename, onDelete, onSetDefault, busy,
}: {
  profile: BackendProfile;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onSetDefault: () => void;
  busy: boolean;
}) {
  const [mode, setMode] = useState<'idle' | 'rename' | 'confirm'>('idle');
  const [name, setName] = useState(profile.display_name);
  const role = profile.facts.find((f) => f.category === 'identity' && f.key === 'current_title')?.value;
  const pct = computeCompleteness(profile).percent;

  if (mode === 'rename') {
    const save = () => { const v = name.trim(); if (v && v !== profile.display_name) onRename(v); setMode('idle'); };
    return (
      <div className="flex min-h-[141px] flex-col justify-center rounded-xl border border-primary/40 bg-card p-4 shadow-[var(--shadow-pop)]">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} disabled={busy} placeholder="Profile name"
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setName(profile.display_name); setMode('idle'); } }}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]" />
        <div className="mt-2.5 flex items-center gap-2">
          <button type="button" onClick={save} disabled={busy || !name.trim()} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50"><Check className="size-3.5" /> Save</button>
          <button type="button" onClick={() => { setName(profile.display_name); setMode('idle'); }} disabled={busy} className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-muted">Cancel</button>
        </div>
      </div>
    );
  }

  if (mode === 'confirm') {
    return (
      <div className="flex min-h-[141px] flex-col justify-center rounded-xl border border-rose-300 bg-rose-50/60 p-4">
        <p className="text-[13px] font-semibold text-foreground">Delete “{profile.display_name}”?</p>
        <p className="mt-1 text-[12px] text-muted-foreground">Permanently deletes this profile and its extracted resume data. This can’t be undone.</p>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={onDelete} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Delete</button>
          <button type="button" onClick={() => setMode('idle')} disabled={busy} className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-muted">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex min-h-[141px] flex-col justify-center rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary/30 hover:bg-muted/20 hover:shadow-[var(--shadow-pop)]">
      <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        {!profile.is_default ? <button type="button" title="Set as default" onClick={onSetDefault} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"><Star className="size-3.5" /></button> : null}
        <button type="button" title="Rename" onClick={() => { setName(profile.display_name); setMode('rename'); }} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-3.5" /></button>
        <button type="button" title="Delete" onClick={() => setMode('confirm')} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-rose-100 hover:text-rose-600"><Trash2 className="size-3.5" /></button>
      </div>
      <button type="button" onClick={onOpen} className="flex flex-col text-left">
        <div className="flex items-center gap-2.5 pr-16">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FolderOpen className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[14px] font-semibold text-foreground">{profile.display_name}</p>
              {profile.is_default ? <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"><Star className="size-2.5 fill-current" /> Default</span> : null}
            </div>
            <p className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">{role ? stripRefs(role) : 'No title yet'}</p>
          </div>
        </div>
        <div className="mt-3 flex w-full items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">{pct}%</span>
        </div>
        {profile.source_filename ? (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground" title={profile.source_filename}>
            <FileText className="size-3 shrink-0" /> <span className="truncate">{profile.source_filename}</span>
          </p>
        ) : null}
      </button>
    </div>
  );
}

function ProfilesView() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const activeProfileId = useActiveProfileId();
  const profilesQ = useQuery({ queryKey: ['profiles'], queryFn: listProfiles });

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateProfile(id, { display_name: name }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.setQueryData(profileQueryKey(updated.id), updated);
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProfile(id),
    onSuccess: (_res, id) => {
      if (activeProfileId === id) void clearActiveProfileId();
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
  const setDefaultMut = useMutation({
    mutationFn: (id: string) => setDefaultProfile(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.setQueryData(profileQueryKey(updated.id), updated);
    },
  });
  const pendingId = (deleteMut.isPending ? deleteMut.variables : undefined) as string | undefined;

  if (creating) return <Onboarding onCreated={() => setCreating(false)} onCancel={() => setCreating(false)} />;

  if (profilesQ.isLoading) return <div className="grid min-h-[300px] place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;

  const profiles = profilesQ.data ?? [];
  const empty = profiles.length === 0;

  return (
    <div className="w-full">
      <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-primary">Profiles</p>
      <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em] text-foreground">{empty ? 'Create your first profile' : 'Choose a profile'}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {empty ? 'Each profile has its own resume, details, and tailored applications.' : 'Pick a profile to open, or create a new one for a different role or resume.'}
      </p>

      {deleteMut.isError ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">Couldn’t delete that profile. Please try again.</p> : null}

      <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
        {profiles.map((pr) => (
          <ProfileGridCard key={pr.id} profile={pr}
            busy={(renameMut.isPending && renameMut.variables?.id === pr.id) || pendingId === pr.id || (setDefaultMut.isPending && setDefaultMut.variables === pr.id)}
            onOpen={() => { void setActiveProfileId(pr.id); }}
            onRename={(name) => renameMut.mutate({ id: pr.id, name })}
            onDelete={() => deleteMut.mutate(pr.id)}
            onSetDefault={() => setDefaultMut.mutate(pr.id)} />
        ))}
        <button type="button" onClick={() => setCreating(true)}
          className="flex min-h-[141px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border p-4 text-center text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
          <span className="grid size-9 place-items-center rounded-lg bg-muted"><Plus className="size-4.5" /></span>
          <span className="text-[13px] font-semibold">New profile</span>
        </button>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const activeProfileId = useActiveProfileId();
  if (activeProfileId === undefined) return <div className="grid min-h-[300px] place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  return activeProfileId ? <ProfileView profileId={activeProfileId} /> : <ProfilesView />;
}
