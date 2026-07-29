import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Zap, Layers, Send, UserCheck, Target, Settings2, Eye, X, Loader2, RefreshCw,
  Inbox, Pause, Play, StopCircle, RotateCcw, SkipForward, ExternalLink, ChevronDown, Activity,
} from 'lucide-react';
import {
  listAutoApplyQueue, autoApplyQueueKey, removeAutoApplyItem, listAutoApplyPipelines,
  autoApplyPipelinesKey, controlAutoApplyPipeline, actOnAutoApplyItem,
} from '../api/auto-apply';
import { useActiveProfileId } from '../lib/active-profile';
import { BackendError } from '../api/client';
import { PageHeader } from '../components/page-header';
import { PageLayout, PageScrollArea } from '../components/page-layout';

const STATUS_TONE: Record<string, string> = {
  awaiting_approval: 'bg-amber-50 text-amber-700',
  tailoring: 'bg-primary/10 text-primary',
  queued: 'bg-muted text-muted-foreground',
  submitted: 'bg-emerald-50 text-emerald-700',
  skipped: 'bg-rose-50 text-rose-700',
};
const STATUS_LABEL: Record<string, string> = {
  awaiting_approval: 'Awaiting approval',
  tailoring: 'Tailoring…',
  queued: 'Queued',
  submitted: 'Submitted',
  skipped: 'Skipped',
};
const SWATCH = ['oklch(0.9 0.06 40)', 'oklch(0.9 0.05 175)', 'oklch(0.9 0.05 250)', 'oklch(0.9 0.06 300)', 'oklch(0.9 0.06 150)', 'oklch(0.9 0.06 20)'];

const FREE_LIMIT = 25;

export function AutoApplyPage() {
  const activeProfileId = useActiveProfileId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: autoApplyQueueKey(activeProfileId ?? ''),
    queryFn: () => listAutoApplyQueue(activeProfileId as string),
    enabled: !!activeProfileId,
  });
  const pipelinesQuery = useQuery({
    queryKey: autoApplyPipelinesKey(activeProfileId ?? ''),
    queryFn: () => listAutoApplyPipelines(activeProfileId as string),
    enabled: !!activeProfileId,
    refetchInterval: 2_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['auto-apply', activeProfileId] });
  const invalidateAll = () => {
    void invalidate();
    void queryClient.invalidateQueries({ queryKey: ['auto-apply-pipelines', activeProfileId] });
  };
  const control = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'pause' | 'resume' | 'cancel' }) => controlAutoApplyPipeline(id, action),
    onSuccess: invalidateAll,
  });
  const itemAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'retry' | 'skip' | 'approve' }) => actOnAutoApplyItem(id, action),
    onSuccess: invalidateAll,
  });
  const dismiss = useMutation({ mutationFn: (id: string) => removeAutoApplyItem(id), onSuccess: invalidate });

  const rows = query.data?.items ?? [];
  const pipelines = pipelinesQuery.data?.items ?? [];
  const activePipeline = pipelines.find((pipeline) => ['running', 'paused', 'queued'].includes(pipeline.status));
  const stats = query.data?.stats ?? { in_queue: 0, applied_today: 0, awaiting_approval: 0, avg_match: 0 };
  const STAT_CELLS = [
    { label: 'In queue', value: String(stats.in_queue), foot: `${stats.awaiting_approval} ready to review`, icon: Layers },
    { label: 'Applied today', value: String(stats.applied_today), foot: `of ${FREE_LIMIT} free / day`, icon: Send },
    { label: 'Awaiting approval', value: String(stats.awaiting_approval), foot: 'needs your review', icon: UserCheck },
    { label: 'Avg match', value: stats.avg_match ? `${stats.avg_match}%` : '—', foot: 'across the queue', icon: Target },
  ];
  const freePct = Math.min(100, Math.round((stats.applied_today / FREE_LIMIT) * 100));

  return (
    <PageLayout>
      <PageHeader
        title="Auto-Apply Queue"
        description="Run supported applications one by one, with a complete status trail and safe handoff when a form needs you."
        actions={(
          <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-foreground">Auto-apply</span>
          <button role="switch" aria-checked={activePipeline?.status === 'running'} onClick={() => {
            if (!activePipeline) return;
            const action = activePipeline.status === 'running' ? 'pause' : 'resume';
            control.mutate({ id: activePipeline.id, action });
          }} disabled={!activePipeline || control.isPending} className={'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ' + (activePipeline?.status === 'running' ? 'bg-primary' : 'bg-muted-foreground/30')}>
            <span className="inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200" style={{ transform: activePipeline?.status === 'running' ? 'translateX(22px)' : 'translateX(2px)' }} />
          </button>
          <button className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"><Settings2 className="size-4.5" /></button>
          </div>
        )}
      />

      <PageScrollArea className="mt-5 pr-1">
      {!activeProfileId ? (
        <div className="mt-6 grid min-h-[280px] place-items-center rounded-2xl border border-dashed border-border">
          <div className="text-center">
            <Inbox className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">No profile yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Create a profile, then tick “Auto-apply” on roles in Browse Jobs to fill this queue.</p>
          </div>
        </div>
      ) : (
        <>
          {/* banner */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary"><Zap className="size-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{activePipeline ? `Pipeline is ${activePipeline.status.replaceAll('_', ' ')}` : 'No active pipeline'}</p>
                  <p className="text-xs text-muted-foreground">Supported applications run one at a time. Login, CAPTCHA, custom questions, and unsupported forms pause safely for you.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Free applications <span className="font-semibold text-foreground">{stats.applied_today} / {FREE_LIMIT}</span></p>
                  <div className="mt-1 h-1.5 w-36 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${freePct}%` }} /></div>
                </div>
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_4px_11px_-5px_oklch(0.66_0.19_265_/_0.5)] hover:bg-[var(--primary-hover)]"><Zap className="size-4" /> Upgrade</button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 lg:grid-cols-4">
              {STAT_CELLS.map(({ label, value, foot, icon: Icon }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-foreground">{value}</p>
                    <p className="text-[11px] text-muted-foreground">{foot}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* execution pipeline */}
          {activePipeline ? (
            <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Activity className="size-4" /></span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-foreground">Active execution pipeline</h2>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{activePipeline.execution_mode}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{activePipeline.completed_count} of {activePipeline.total_count} finished · {activePipeline.failed_count} skipped or failed</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activePipeline.status === 'running' ? (
                    <button onClick={() => control.mutate({ id: activePipeline.id, action: 'pause' })} disabled={control.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"><Pause className="size-3.5" /> Pause</button>
                  ) : (
                    <button onClick={() => control.mutate({ id: activePipeline.id, action: 'resume' })} disabled={control.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"><Play className="size-3.5" /> Resume</button>
                  )}
                  <button onClick={() => control.mutate({ id: activePipeline.id, action: 'cancel' })} disabled={control.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"><StopCircle className="size-3.5" /> Cancel</button>
                </div>
              </header>
              <div className="h-1.5 bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${activePipeline.total_count ? Math.round((activePipeline.completed_count / activePipeline.total_count) * 100) : 0}%` }} /></div>
              <div>
                {activePipeline.items.map((item) => {
                  const actionable = ['blocked', 'failed', 'retry_wait', 'ready_for_review'].includes(item.stage);
                  return (
                    <details key={item.id} className="group border-b border-border last:border-0">
                      <summary className="grid cursor-pointer list-none grid-cols-[30px_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 hover:bg-muted/20">
                        <span className="grid size-7 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{item.position + 1}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{item.role}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.company}{item.attempt_count ? ` · Attempt ${item.attempt_count}/3` : ''}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.stage === 'submitted' ? 'bg-emerald-50 text-emerald-700' : actionable ? 'bg-amber-50 text-amber-700' : item.stage === 'queued' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>{item.stage.replaceAll('_', ' ')}</span>
                        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="border-t border-border bg-muted/15 px-4 py-3">
                        {item.last_error ? <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{item.last_error}</p> : null}
                        <div className="space-y-2">
                          {item.events.map((event, index) => (
                            <div key={`${event.at}-${index}`} className="grid grid-cols-[8px_1fr_auto] items-start gap-2 text-xs">
                              <span className="mt-1.5 size-2 rounded-full bg-primary" />
                              <div><p className="font-medium text-foreground">{event.message}</p><p className="text-muted-foreground">{event.stage.replaceAll('_', ' ')}{event.error_code ? ` · ${event.error_code}` : ''}</p></div>
                              <time className="text-[10px] text-muted-foreground">{new Date(event.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                            </div>
                          ))}
                          {item.events.length === 0 ? <p className="text-xs text-muted-foreground">Waiting in queue.</p> : null}
                        </div>
                        {actionable ? (
                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            {item.application_url ? <a href={item.application_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold"><ExternalLink className="size-3.5" /> Open application</a> : null}
                            {item.stage === 'ready_for_review' ? <button onClick={() => itemAction.mutate({ id: item.id, action: 'approve' })} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"><Eye className="size-3.5" /> Approve submission</button> : null}
                            {item.stage !== 'ready_for_review' ? <button onClick={() => itemAction.mutate({ id: item.id, action: 'retry' })} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold"><RotateCcw className="size-3.5" /> Retry</button> : null}
                            <button onClick={() => itemAction.mutate({ id: item.id, action: 'skip' })} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold"><SkipForward className="size-3.5" /> Skip</button>
                          </div>
                        ) : null}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* queue */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                Application queue <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[12px] font-bold text-primary">{rows.length}</span>
              </span>
              {query.isFetching ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
            </div>
            <div className="grid grid-cols-[2.2fr_0.7fr_1.1fr_1fr_1.2fr] items-center gap-3 border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <span>Role</span><span>Match</span><span>Status</span><span>Added</span><span className="text-right">Actions</span>
            </div>

            {query.isLoading ? (
              <div className="grid place-items-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : query.isError ? (
              <div className="grid place-items-center py-16 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">{query.error instanceof BackendError ? query.error.message : 'Failed to load.'}</p>
                  <button onClick={() => query.refetch()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-muted"><RefreshCw className="size-3.5" /> Retry</button>
                </div>
              </div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-14 text-center text-sm text-muted-foreground">Queue is empty — tick “Auto-apply” on roles in Browse Jobs.</div>
            ) : (
              rows.map((r, i) => (
                <div key={r.id} className="grid grid-cols-[2.2fr_0.7fr_1.1fr_1fr_1.2fr] items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-0 hover:bg-muted/20">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="size-8 shrink-0 rounded-lg" style={{ background: SWATCH[i % SWATCH.length] }} />
                    <div className="min-w-0"><p className="truncate font-medium text-foreground">{r.role}</p><p className="truncate text-xs text-muted-foreground">{r.company}</p></div>
                  </div>
                  <span className="font-semibold text-foreground">{r.match_score != null ? `${Math.round(r.match_score)}%` : '—'}</span>
                  <span><span className={'rounded-full px-2 py-0.5 text-[11px] font-semibold ' + (STATUS_TONE[r.status] ?? 'bg-muted text-muted-foreground')}>{STATUS_LABEL[r.status] ?? r.status}</span></span>
                  <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <span className="flex items-center justify-end gap-1.5">
                    {r.status !== 'submitted' && r.status !== 'skipped' ? (
                      <button onClick={() => itemAction.mutate({ id: r.id, action: 'approve' })} disabled={itemAction.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-[12px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"><Eye className="size-3.5" /> Approve</button>
                    ) : null}
                    <button onClick={() => dismiss.mutate(r.id)} disabled={dismiss.isPending} className="flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-3.5" /></button>
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
      </PageScrollArea>
    </PageLayout>
  );
}
