import { useCallback, useState } from 'react';
import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import {
  CheckCheck, Zap, Check, ExternalLink, Loader2, RefreshCw, Bookmark, EyeOff, X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  listJobPostings, listJobPostingFacets, jobPostingsQueryKey,
  jobPostingFacetsQueryKey, quickApplyToJobPosting, updateCandidateJobState,
} from '../api/job-postings';
import { createAutoApplyPipeline } from '../api/auto-apply';
import { createApplication } from '../api/applications';
import { QUICK_APPLY_VENDORS, type JobPosting } from '../schemas/job-posting';
import { useActiveProfileId } from '../lib/active-profile';
import { BackendError } from '../api/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApplicationMethodToggle, JobFilterBar, JobSortControl } from '../features/job-filters/job-filter-bar';
import { parseJobFilterSearch, serializeJobFilterSearch, type JobFilterState } from '../features/job-filters/job-filter-state';
import { formatPostedDate, jobCardMetadata } from '../features/job-cards/job-card-metadata';
import type { JobCardMetadataTone } from '../features/job-cards/job-card-metadata';
import {
  applicationSelectionMode,
  runQuickApplyBatch,
  type QuickApplyBatchProgress,
} from '../features/job-cards/job-application-selection';
import { PageHeader } from '../components/page-header';
import { PageLayout } from '../components/page-layout';
import {
  orderedSelectedJobs,
  withoutSelectedJob,
} from '../features/auto-apply/auto-apply-pipeline';

const PAGE_SIZE = 24;
const AVAILABLE_ACTION_CLASS =
  'border border-primary/45 bg-card text-primary shadow-sm hover:border-primary hover:bg-primary/5';
const METADATA_TONE_CLASSES: Record<JobCardMetadataTone, string> = {
  neutral: 'bg-muted text-foreground/70',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
};

function vendorLabel(vendor: string): string {
  return vendor.charAt(0).toUpperCase() + vendor.slice(1);
}

export function BrowseJobsPage() {
  const activeProfileId = useActiveProfileId();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseJobFilterSearch(searchParams.toString());
  const selectionMode = applicationSelectionMode(filters.applicationMethods);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [pendingApply, setPendingApply] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<QuickApplyBatchProgress | null>(null);
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pipelineMode, setPipelineMode] = useState<'automatic' | 'review'>('automatic');

  const setFilters = useCallback((next: JobFilterState) => {
    setSearchParams(serializeJobFilterSearch(next), { replace: true });
  }, [setSearchParams]);

  const query = useQuery({
    queryKey: jobPostingsQueryKey(filters, PAGE_SIZE),
    queryFn: () => listJobPostings(filters, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const facetsQuery = useQuery({
    queryKey: jobPostingFacetsQueryKey(filters),
    queryFn: () => listJobPostingFacets(filters),
    placeholderData: keepPreviousData,
  });

  const applyMutation = useMutation({
    mutationFn: (job: JobPosting) =>
      quickApplyToJobPosting(job.id, { profile_id: activeProfileId as string }),
  });
  const pipelineMutation = useMutation({
    mutationFn: (jobIds: string[]) => createAutoApplyPipeline({
      profile_id: activeProfileId as string,
      job_posting_ids: jobIds,
      execution_mode: pipelineMode,
    }),
    onSuccess: () => {
      setSelected(new Set());
      setReviewOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['auto-apply-pipelines', activeProfileId] });
      void queryClient.invalidateQueries({ queryKey: ['auto-apply', activeProfileId] });
      navigate('/applications');
    },
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const jobs = items;
  const toggleSel = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      const adding = !n.has(id);
      if (adding) n.add(id); else n.delete(id);
      return n;
    });
  };
  const selectAll = () => {
    const allSelected = jobs.length > 0 && jobs.every((job) => selected.has(job.id));
    if (allSelected) {
      setSelected(new Set());
      return;
    }

    const ids = new Set(jobs.map((job) => job.id));
    setSelected(ids);
  };
  const recordApplication = async (job: JobPosting, source: string) => {
    if (!activeProfileId) return;
    await createApplication({
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
        void recordApplication(job, 'quick_apply');
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
    void recordApplication(job, 'manual');
  };

  const bulkQuickApply = async () => {
    if (!activeProfileId || selectionMode !== 'quick_apply' || bulkProgress) return;
    const selectedJobs = jobs.filter((job) => selected.has(job.id) && !applied.has(job.id));
    if (selectedJobs.length === 0) return;

    setBulkResult(null);
    setBulkProgress({ completed: 0, total: selectedJobs.length });
    const jobsById = new Map(selectedJobs.map((job) => [job.id, job]));
    const result = await runQuickApplyBatch(
      selectedJobs.map((job) => job.id),
      async (id) => {
        const job = jobsById.get(id);
        if (!job) throw new Error('Job is no longer available.');
        await quickApplyToJobPosting(job.id, { profile_id: activeProfileId });
        await recordApplication(job, 'quick_apply');
      },
      setBulkProgress,
    );

    setApplied((current) => {
      const next = new Set(current);
      for (const id of result.succeeded) next.add(id);
      return next;
    });
    setSelected(new Set(result.failed));
    setBulkResult({
      succeeded: result.succeeded.length,
      failed: result.failed.length,
    });
    setBulkProgress(null);
  };

  return (
    <PageLayout>
      <PageHeader
        title="Browse Jobs"
        description={query.isLoading
          ? 'Loading openings…'
          : `${total.toLocaleString()} live openings synced from Lever, Greenhouse, Ashby & SmartRecruiters.`}
      />
      <JobFilterBar
        value={filters}
        facets={facetsQuery.data}
        facetsLoading={facetsQuery.isFetching}
        activeProfileId={activeProfileId}
        onChange={setFilters}
      />

      {/* select-all row */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-[13px] text-muted-foreground">
            {selectionMode === 'quick_apply'
              ? 'Select roles to submit together with Quick Apply'
              : <>Tick the roles you want, then drop them into your <span className="font-semibold text-foreground">Auto-Apply</span> bucket</>}
            {selected.size > 0 ? <span className="ml-1 rounded-full bg-primary/12 px-2 py-0.5 text-[12px] font-semibold text-primary">{selected.size} selected</span> : '.'}
          </p>
          <button type="button" onClick={selectAll} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:opacity-80">
            <CheckCheck className="size-4" /> {selected.size === jobs.length && jobs.length > 0 ? 'Clear all' : 'Select all'}
          </button>
          {selectionMode === 'quick_apply' ? (
            <>
              <button
                type="button"
                onClick={() => void bulkQuickApply()}
                disabled={!activeProfileId || selected.size === 0 || !!bulkProgress}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/45 bg-card px-3 py-1.5 text-[13px] font-semibold text-primary shadow-sm hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {bulkProgress ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Applying {bulkProgress.completed}/{bulkProgress.total}…</>
                ) : (
                  <><Zap className="size-3.5" /> Quick Apply selected{selected.size > 0 ? ` (${selected.size})` : ''}</>
                )}
              </button>
              {bulkResult ? (
                <span className={`text-[12px] font-medium ${bulkResult.failed > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {bulkResult.succeeded} applied{bulkResult.failed > 0 ? ` · ${bulkResult.failed} failed` : ''}
                </span>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              disabled={!activeProfileId || selected.size === 0}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[13px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Zap className="size-3.5" />
              Schedule Auto-Apply{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ApplicationMethodToggle
            values={filters.applicationMethods}
            onChange={(applicationMethods) => {
              setSelected(new Set());
              setBulkResult(null);
              setFilters({ ...filters, applicationMethods, page: 1 });
            }}
          />
          <JobSortControl
            value={filters.sort}
            activeProfileId={activeProfileId}
            onChange={(sort) => setFilters({ ...filters, sort, page: 1 })}
          />
        </div>
      </div>

      {/* cards */}
      <div
        data-testid="job-results-scroll"
        className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1"
      >
      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[184px] animate-pulse rounded-2xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="grid min-h-[240px] place-items-center rounded-2xl border border-dashed border-border">
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Couldn’t load jobs</p>
            <p className="mt-1 text-xs text-muted-foreground">{query.error instanceof BackendError ? query.error.message : 'The backend is unavailable.'}</p>
            <button onClick={() => query.refetch()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-muted"><RefreshCw className="size-3.5" /> Retry</button>
          </div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="grid min-h-[240px] place-items-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
          No roles match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {jobs.map((job) => {
            const sel = selected.has(job.id);
            const app = applied.has(job.id);
            const busy = pendingApply === job.id;
            const canQuickApply = QUICK_APPLY_VENDORS.has(job.vendor) && !!job.apply_url && !!activeProfileId;
            const postedDate = formatPostedDate(job.posted_at);
            return (
              <article key={job.id} className={'flex flex-col rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-pop)] ' + (sel ? 'border-primary ring-1 ring-primary/30' : 'border-border')}>
                <div className="flex min-h-0 flex-1 items-start justify-between gap-2">
                  <a
                    href={job.hosted_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${job.title} at ${job.company} in a new tab`}
                    className="group min-w-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight text-foreground transition-colors group-hover:text-primary group-hover:underline">{job.title}</h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.company}{job.location ? ` · ${job.location}` : ''}</p>
                    {postedDate ? <p className="mt-1 text-[11px] text-muted-foreground/80">Posted {postedDate}</p> : null}
                  </a>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold capitalize text-primary">{vendorLabel(job.vendor)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {jobCardMetadata(job).map((metadata) => (
                    <span
                      key={metadata.key}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${METADATA_TONE_CLASSES[metadata.tone]}`}
                    >
                      {metadata.label}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <label className="flex cursor-pointer select-none items-center gap-1.5 text-[12px] text-muted-foreground">
                    <input type="checkbox" checked={sel} onChange={() => toggleSel(job.id)} disabled={!!bulkProgress || app} className="size-3.5 accent-[var(--primary)]" /> {selectionMode === 'quick_apply' ? 'Select' : 'Auto-apply'}
                  </label>
                  <div className="flex items-center gap-1">
                  {activeProfileId ? <button type="button" title={job.saved ? 'Unsave job' : 'Save job'} onClick={() => updateCandidateJobState(job.id, activeProfileId, { saved: !job.saved }).then(() => { queryClient.invalidateQueries({ queryKey: ['job-postings'] }); queryClient.invalidateQueries({ queryKey: ['job-posting-facets'] }); })} className={'grid size-7 place-items-center rounded-lg ' + (job.saved ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}><Bookmark className="size-3.5" /></button> : null}
                  {activeProfileId ? <button type="button" title="Dismiss job" onClick={() => updateCandidateJobState(job.id, activeProfileId, { dismissed: true }).then(() => queryClient.invalidateQueries({ queryKey: ['job-postings'] }))} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><EyeOff className="size-3.5" /></button> : null}
                  <button
                    type="button"
                    onClick={() => applyToJob(job)}
                    disabled={app || busy}
                     className={
                       'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ' +
                        (app
                          ? 'bg-emerald-50 text-emerald-700'
                          : AVAILABLE_ACTION_CLASS)
                     }
                  >
                    {app ? <><Check className="size-3.5" /> Applied</>
                       : busy ? <><Loader2 className="size-3.5 animate-spin" /> Applying…</>
                       : canQuickApply ? <><Zap className="size-3.5" /> Quick Apply</>
                       : <><ExternalLink className="size-3.5" /> Apply</>}
                  </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      </div>

      {/* pagination */}
      {total > PAGE_SIZE ? (
        <div className="mt-3 flex shrink-0 items-center justify-between">
          <p className="text-[13px] text-muted-foreground">
            Page {filters.page} of {totalPages} · {total.toLocaleString()} roles
            {query.isFetching ? <Loader2 className="ml-2 inline size-3.5 animate-spin align-[-2px] text-muted-foreground" /> : null}
          </p>
          <div className="flex items-center gap-2">
            <button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })} className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-foreground disabled:opacity-40 enabled:hover:bg-muted">Previous</button>
            <button disabled={filters.page >= totalPages} onClick={() => setFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) })} className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-foreground disabled:opacity-40 enabled:hover:bg-muted">Next</button>
          </div>
        </div>
      ) : null}

      {reviewOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setReviewOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="auto-apply-review-title"
            className="flex max-h-[min(680px,calc(100vh-32px))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-pop)]"
          >
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h2 id="auto-apply-review-title" className="text-lg font-semibold text-foreground">
                  Review Auto-Apply pipeline
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Jobs run one at a time. Review the list before starting.
                </p>
              </div>
              <button type="button" onClick={() => setReviewOpen(false)} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
              {orderedSelectedJobs(jobs, selected).map((job, index) => (
                <div key={job.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{job.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{job.company}{job.location ? ` · ${job.location}` : ''}</p>
                  </div>
                  <button type="button" onClick={() => setSelected((current) => withoutSelectedJob(current, job.id))} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label={`Remove ${job.title}`}>
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-5 py-4">
              {pipelineMutation.isError ? (
                <p className="mb-3 text-xs font-medium text-rose-700">
                  {pipelineMutation.error instanceof BackendError ? pipelineMutation.error.message : 'Could not create the pipeline.'}
                </p>
              ) : null}
              <div className="mb-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPipelineMode('automatic')}
                  className={`rounded-xl border p-3 text-left ${pipelineMode === 'automatic' ? 'border-primary bg-primary/5 ring-1 ring-primary/25' : 'border-border'}`}>
                  <span className="block text-sm font-semibold text-foreground">Automatic</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Submit supported jobs one by one. Pause safely when login, CAPTCHA, or unsupported forms need you.</span>
                </button>
                <button type="button" onClick={() => setPipelineMode('review')}
                  className={`rounded-xl border p-3 text-left ${pipelineMode === 'review' ? 'border-primary bg-primary/5 ring-1 ring-primary/25' : 'border-border'}`}>
                  <span className="block text-sm font-semibold text-foreground">Review each</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Prepare one application at a time and wait for approval before submission.</span>
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{selected.size} job{selected.size === 1 ? '' : 's'} · {pipelineMode === 'automatic' ? 'Automatic' : 'Review each'} · Start now</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setReviewOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">Cancel</button>
                  <button
                    type="button"
                    disabled={selected.size === 0 || pipelineMutation.isPending}
                    onClick={() => pipelineMutation.mutate(orderedSelectedJobs(jobs, selected).map((job) => job.id))}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-45"
                  >
                    {pipelineMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                    Start now
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </PageLayout>
  );
}
