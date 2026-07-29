import { useMemo, useState } from 'react';
import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import {
  Search, Ban, Calendar, MapPin, Building2, GraduationCap, Briefcase,
  Clock3, ChevronDown, ArrowUpDown, CheckCheck, Zap, X, Check, ExternalLink,
  Loader2, RefreshCw,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { listJobPostings, jobPostingsQueryKey, quickApplyToJobPosting } from '../api/job-postings';
import { enqueueAutoApply } from '../api/auto-apply';
import { createApplication } from '../api/applications';
import { QUICK_APPLY_VENDORS, type JobPosting } from '../schemas/job-posting';
import { useActiveProfileId } from '../lib/active-profile';
import { BackendError } from '../api/client';

const PAGE_SIZE = 24;

const FILTERS = [
  { key: 'Date', icon: Calendar }, { key: 'Location', icon: MapPin }, { key: 'Workplace', icon: Building2 },
  { key: 'Companies', icon: Building2 }, { key: 'Degree Level', icon: GraduationCap }, { key: 'Max Experience', icon: Clock3 },
  { key: 'Sponsors Visa', icon: Briefcase }, { key: 'Role', icon: Briefcase }, { key: 'Job Type', icon: Briefcase },
];

const SORTS = ['Newest', 'Oldest', 'Company A–Z'] as const;
type Sort = (typeof SORTS)[number];

function vendorLabel(vendor: string): string {
  return vendor.charAt(0).toUpperCase() + vendor.slice(1);
}

function postedLabel(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function BrowseJobsPage() {
  const activeProfileId = useActiveProfileId();
  const queryClient = useQueryClient();
  const [include, setInclude] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [exclude, setExclude] = useState('');
  const [active, setActive] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>('Newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pendingApply, setPendingApply] = useState<string | null>(null);

  const search = include.join(' ').trim();

  const query = useQuery({
    queryKey: jobPostingsQueryKey(search, page, PAGE_SIZE),
    queryFn: () => listJobPostings(search, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  const applyMutation = useMutation({
    mutationFn: (job: JobPosting) =>
      quickApplyToJobPosting(job.id, { profile_id: activeProfileId as string }),
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const jobs = useMemo(() => {
    let list = items.filter((j) => {
      if (!exclude.trim()) return true;
      const hay = (j.title + ' ' + j.company + ' ' + (j.location ?? '') + ' ' + (j.team ?? '')).toLowerCase();
      return !hay.includes(exclude.trim().toLowerCase());
    });
    if (sort === 'Newest') list = [...list].sort((a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? ''));
    if (sort === 'Oldest') list = [...list].sort((a, b) => (a.posted_at ?? '').localeCompare(b.posted_at ?? ''));
    if (sort === 'Company A–Z') list = [...list].sort((a, b) => a.company.localeCompare(b.company));
    return list;
  }, [items, exclude, sort]);

  const toggleFilter = (k: string) => setActive((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const toggleSel = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      const adding = !n.has(id);
      if (adding) n.add(id); else n.delete(id);
      // Adding a role to the bucket enqueues it for auto-apply (needs a profile).
      if (adding && activeProfileId) {
        enqueueAutoApply({ profile_id: activeProfileId, job_posting_id: id })
          .then(() => queryClient.invalidateQueries({ queryKey: ['auto-apply', activeProfileId] }))
          .catch(() => { /* surfaced elsewhere; keep selection optimistic */ });
      }
      return n;
    });
  };
  const selectAll = () => setSelected((s) => s.size === jobs.length ? new Set() : new Set(jobs.map((j) => j.id)));
  const addChip = () => { const v = draft.trim(); if (v && !include.includes(v)) { setInclude((c) => [...c, v]); setPage(1); } setDraft(''); };
  const removeChip = (chip: string) => { setInclude((c) => c.filter((x) => x !== chip)); setPage(1); };

  const recordApplication = (job: JobPosting, source: string) => {
    if (!activeProfileId) return;
    createApplication({
      profile_id: activeProfileId,
      job_posting_id: job.id,
      role: job.title,
      company: job.company,
      location: job.location,
      source,
    })
      .then(() => queryClient.invalidateQueries({ queryKey: ['applications', activeProfileId] }))
      .catch(() => { /* non-blocking */ });
  };

  const applyToJob = async (job: JobPosting) => {
    const canQuickApply = QUICK_APPLY_VENDORS.has(job.vendor) && !!job.apply_url && !!activeProfileId;
    if (canQuickApply) {
      setPendingApply(job.id);
      try {
        await applyMutation.mutateAsync(job);
        setApplied((s) => new Set(s).add(job.id));
        recordApplication(job, 'quick_apply');
      } catch {
        // Fall back to opening the posting if the automated apply fails.
        window.open(job.apply_url ?? job.hosted_url, '_blank', 'noopener');
      } finally {
        setPendingApply(null);
      }
      return;
    }
    window.open(job.apply_url ?? job.hosted_url, '_blank', 'noopener');
    setApplied((s) => new Set(s).add(job.id));
    recordApplication(job, 'manual');
  };

  return (
    <div className="w-full">
      <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-primary">Discover</p>
      <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em] text-foreground">Browse Jobs</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {query.isLoading ? 'Loading openings…' : `${total.toLocaleString()} live openings synced from Lever, Greenhouse, Ashby & SmartRecruiters.`}
      </p>

      {/* search */}
      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-card)]">
        <div className="flex flex-1 flex-wrap items-center gap-1.5 px-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          {include.map((chip) => (
            <span key={chip} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[13px] font-medium text-foreground">
              {chip}
              <X className="size-3 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => removeChip(chip)} />
            </span>
          ))}
          <input
            className="min-w-[140px] flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Search title, company or keyword…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addChip(); if (e.key === 'Backspace' && !draft && include.length) removeChip(include[include.length - 1]); }}
          />
        </div>
        <div className="flex items-center gap-2 border-l border-border pl-3 pr-2">
          <Ban className="size-4 text-muted-foreground" />
          <input
            className="w-48 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Exclude keywords…"
            value={exclude}
            onChange={(e) => setExclude(e.target.value)}
          />
        </div>
      </div>

      {/* filters */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {FILTERS.map(({ key, icon: Icon }) => {
          const on = active.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleFilter(key)}
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ' +
                (on ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground/80 hover:bg-muted')
              }
            >
              <Icon className="size-3.5" />
              <span>{key}</span>
              {on ? <X className="size-3.5" /> : <ChevronDown className="size-3.5 opacity-60" />}
            </button>
          );
        })}
        <div className="relative ml-auto">
          <button type="button" onClick={() => setSortOpen((o) => !o)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-foreground/80 hover:bg-muted">
            <ArrowUpDown className="size-3.5" /> {sort} <ChevronDown className="size-3.5 opacity-60" />
          </button>
          {sortOpen ? (
            <div className="absolute right-0 top-full z-10 mt-1 w-52 rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-pop)]">
              {SORTS.map((s) => (
                <button key={s} type="button" onClick={() => { setSort(s); setSortOpen(false); }} className={'flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[13px] hover:bg-muted ' + (s === sort ? 'text-primary font-semibold' : 'text-foreground')}>
                  {s} {s === sort ? <Check className="size-3.5" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* select-all row */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">
          Tick the roles you want, then drop them into your <span className="font-semibold text-foreground">Auto-Apply</span> bucket
          {selected.size > 0 ? <span className="ml-1 rounded-full bg-primary/12 px-2 py-0.5 text-[12px] font-semibold text-primary">{selected.size} selected</span> : '.'}
        </p>
        <button type="button" onClick={selectAll} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:opacity-80">
          <CheckCheck className="size-4" /> {selected.size === jobs.length && jobs.length > 0 ? 'Clear all' : 'Select all'}
        </button>
      </div>

      {/* cards */}
      {query.isLoading ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[184px] animate-pulse rounded-2xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="mt-4 grid min-h-[240px] place-items-center rounded-2xl border border-dashed border-border">
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Couldn’t load jobs</p>
            <p className="mt-1 text-xs text-muted-foreground">{query.error instanceof BackendError ? query.error.message : 'The backend is unavailable.'}</p>
            <button onClick={() => query.refetch()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-muted"><RefreshCw className="size-3.5" /> Retry</button>
          </div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="mt-4 grid min-h-[240px] place-items-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
          No roles match your search.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {jobs.map((job) => {
            const sel = selected.has(job.id);
            const app = applied.has(job.id);
            const busy = pendingApply === job.id;
            const canQuickApply = QUICK_APPLY_VENDORS.has(job.vendor) && !!job.apply_url && !!activeProfileId;
            return (
              <article key={job.id} className={'flex flex-col rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-pop)] ' + (sel ? 'border-primary ring-1 ring-primary/30' : 'border-border')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight text-foreground">{job.title}</h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.company}{job.location ? ` · ${job.location}` : ''}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold capitalize text-primary">{vendorLabel(job.vendor)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.commitment ? <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70">{job.commitment}</span> : null}
                  {job.team ? <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70">{job.team}</span> : null}
                  {job.posted_at ? <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70">{postedLabel(job.posted_at)}</span> : null}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <label className="flex cursor-pointer select-none items-center gap-1.5 text-[12px] text-muted-foreground">
                    <input type="checkbox" checked={sel} onChange={() => toggleSel(job.id)} className="size-3.5 accent-[var(--primary)]" /> Auto-apply
                  </label>
                  <button
                    type="button"
                    onClick={() => applyToJob(job)}
                    disabled={app || busy}
                    className={
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ' +
                      (app ? 'bg-emerald-50 text-emerald-700' : 'bg-primary text-primary-foreground shadow-[0_4px_11px_-5px_oklch(0.66_0.19_265_/_0.5)] hover:bg-[var(--primary-hover)]')
                    }
                  >
                    {app ? <><Check className="size-3.5" /> Applied</>
                      : busy ? <><Loader2 className="size-3.5 animate-spin" /> Applying…</>
                      : canQuickApply ? <><Zap className="size-3.5" /> Quick Apply</>
                      : <><ExternalLink className="size-3.5" /> View & Apply</>}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* pagination */}
      {total > PAGE_SIZE ? (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">
            Page {page} of {totalPages} · {total.toLocaleString()} roles
            {query.isFetching ? <Loader2 className="ml-2 inline size-3.5 animate-spin align-[-2px] text-muted-foreground" /> : null}
          </p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-foreground disabled:opacity-40 enabled:hover:bg-muted">Previous</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-foreground disabled:opacity-40 enabled:hover:bg-muted">Next</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
