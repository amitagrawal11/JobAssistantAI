import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, FolderOpen } from 'lucide-react';
import { listApplications, applicationsQueryKey, updateApplicationStatus } from '../api/applications';
import type { ApplicationOutcome } from '../schemas/tracked-application';
import { useActiveProfileId } from '../lib/active-profile';
import { BackendError } from '../api/client';

const STATUS_TONE: Record<string, string> = {
  applied: 'bg-primary/10 text-primary',
  interview: 'bg-amber-50 text-amber-700',
  offer: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
};
const LABEL: Record<string, string> = { applied: 'Applied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected' };
const FILTERS = ['All', 'applied', 'interview', 'offer', 'rejected'] as const;
const NEXT: ApplicationOutcome[] = ['applied', 'interview', 'offer', 'rejected'];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ApplicationsPage() {
  const activeProfileId = useActiveProfileId();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const query = useQuery({
    queryKey: applicationsQueryKey(activeProfileId ?? '', filter),
    queryFn: () => listApplications(activeProfileId as string, filter),
    enabled: !!activeProfileId,
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationOutcome }) => updateApplicationStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications', activeProfileId] }),
  });

  const rows = query.data?.items ?? [];
  const counts = query.data?.counts ?? {};

  return (
    <div className="w-full">
      <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-primary">Track</p>
      <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em] text-foreground">Applications</h1>
      <p className="mt-1 text-sm text-muted-foreground">Everything you’ve applied to, in one place.</p>

      {!activeProfileId ? (
        <div className="mt-6 grid min-h-[280px] place-items-center rounded-2xl border border-dashed border-border">
          <div className="text-center">
            <FolderOpen className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">No profile yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Set up your profile and start applying to see your applications here.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ' + (f === filter ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground/80 hover:bg-muted')}>
                {f === 'All' ? 'All' : LABEL[f]}
                {f !== 'All' ? <span className="ml-1.5 text-muted-foreground">{counts[f] ?? 0}</span> : null}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="grid grid-cols-[2fr_1.4fr_1fr_0.8fr_0.8fr] gap-3 border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <span>Role</span><span>Company</span><span>Status</span><span>Match</span><span>Applied</span>
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
              <div className="px-4 py-14 text-center text-sm text-muted-foreground">
                {filter === 'All' ? 'You haven’t applied to anything yet — head to Browse Jobs.' : `No applications in ${LABEL[filter]}.`}
              </div>
            ) : (
              rows.map((a) => (
                <div key={a.id} className="grid grid-cols-[2fr_1.4fr_1fr_0.8fr_0.8fr] items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-0 hover:bg-muted/30">
                  <span className="min-w-0 truncate font-medium text-foreground">{a.role}</span>
                  <span className="truncate text-muted-foreground">{a.company}</span>
                  <span>
                    <select
                      value={a.status}
                      onChange={(e) => advance.mutate({ id: a.id, status: e.target.value as ApplicationOutcome })}
                      className={'cursor-pointer rounded-full border-0 px-2 py-0.5 text-[11px] font-semibold outline-none ' + (STATUS_TONE[a.status] ?? 'bg-muted text-muted-foreground')}
                    >
                      {NEXT.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                    </select>
                  </span>
                  <span className="font-semibold text-foreground">{a.match_score != null ? `${Math.round(a.match_score)}%` : '—'}</span>
                  <span className="text-muted-foreground">{fmtDate(a.applied_at)}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
