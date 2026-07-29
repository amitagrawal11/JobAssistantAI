import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap, Layers, Send, UserCheck, Target, Settings2, Eye, X, Loader2, RefreshCw, Inbox } from 'lucide-react';
import { listAutoApplyQueue, autoApplyQueueKey, updateAutoApplyStatus, removeAutoApplyItem } from '../api/auto-apply';
import type { AutoApplyStatus } from '../schemas/auto-apply';
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
  const [on, setOn] = useState(true);

  const query = useQuery({
    queryKey: autoApplyQueueKey(activeProfileId ?? ''),
    queryFn: () => listAutoApplyQueue(activeProfileId as string),
    enabled: !!activeProfileId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['auto-apply', activeProfileId] });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AutoApplyStatus }) => updateAutoApplyStatus(id, status),
    onSuccess: invalidate,
  });
  const dismiss = useMutation({ mutationFn: (id: string) => removeAutoApplyItem(id), onSuccess: invalidate });

  const rows = query.data?.items ?? [];
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
        description="Pathway tailors and applies to matched roles — with your approval on every submission."
        actions={(
          <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-foreground">Auto-apply</span>
          <button role="switch" aria-checked={on} onClick={() => setOn((v) => !v)} className={'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ' + (on ? 'bg-primary' : 'bg-muted-foreground/30')}>
            <span className="inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200" style={{ transform: on ? 'translateX(22px)' : 'translateX(2px)' }} />
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
                  <p className="text-sm font-semibold text-foreground">{on ? 'Auto-apply is active' : 'Auto-apply is paused'}</p>
                  <p className="text-xs text-muted-foreground">Roles above 85% match are tailored and submitted automatically. Everything else waits for your review.</p>
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
                      <button onClick={() => setStatus.mutate({ id: r.id, status: 'submitted' })} disabled={setStatus.isPending}
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
