import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Send, Target, CalendarCheck, Award, ArrowRight, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { getOverview, overviewQueryKey } from '../api/overview';
import { listProfiles } from '../api/profiles';
import { useActiveProfileId } from '../lib/active-profile';
import { BackendError } from '../api/client';
import { PageHeader } from '../components/page-header';
import { PageLayout, PageScrollArea } from '../components/page-layout';

const OUTCOME_COLOR: Record<string, string> = {
  applied: 'oklch(0.62 0.17 265)',
  interview: 'oklch(0.78 0.15 80)',
  offer: 'oklch(0.72 0.15 155)',
  rejected: 'oklch(0.7 0.16 20)',
};
const OUTCOME_LABEL: Record<string, string> = { applied: 'Applied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected' };

function Donut({ outcomes, total }: { outcomes: { status: string; count: number }[]; total: number }) {
  const R = 54, C = 2 * Math.PI * R;
  let offset = 0;
  const segments = total === 0 ? [] : outcomes.filter((o) => o.count > 0).map((o) => {
    const frac = o.count / total;
    const seg = { color: OUTCOME_COLOR[o.status] ?? 'oklch(0.7 0 0)', dash: frac * C, offset };
    offset += frac * C;
    return seg;
  });
  return (
    <div className="relative size-[150px]">
      <svg viewBox="0 0 140 140" className="size-full -rotate-90">
        <circle cx="70" cy="70" r={R} fill="none" stroke="oklch(0.92 0.01 258)" strokeWidth="16" />
        {segments.map((s, i) => (
          <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth="16"
            strokeDasharray={`${s.dash} ${C - s.dash}`} strokeDashoffset={-s.offset} />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-bold tracking-[-0.02em] text-foreground">{total}</span>
        <span className="text-[11px] text-muted-foreground">total</span>
      </div>
    </div>
  );
}

export function OverviewPage() {
  const activeProfileId = useActiveProfileId();
  const profilesQ = useQuery({ queryKey: ['profiles'], queryFn: listProfiles });
  const profiles = profilesQ.data ?? [];
  // Follow the shared header selection, with a default fallback while the
  // profile switcher persists its initial choice.
  const defaultId = profiles.find((p) => p.is_default)?.id;
  const viewedId = activeProfileId ?? defaultId ?? profiles[0]?.id ?? null;

  const query = useQuery({
    queryKey: overviewQueryKey(viewedId ?? ''),
    queryFn: () => getOverview(viewedId as string),
    enabled: !!viewedId,
  });

  if (activeProfileId === undefined || profilesQ.isLoading) {
    return <PageLayout className="grid place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></PageLayout>;
  }

  // Only truly empty when the user has no profiles at all.
  if (profiles.length === 0) {
    return (
      <PageLayout>
        <PageHeader title="Let’s get you hired" />
        <PageScrollArea className="mt-5 pr-1">
        <div className="grid place-items-center rounded-2xl border border-dashed border-border p-12 text-center">
          <Sparkles className="size-8 text-primary" />
          <p className="mt-3 text-sm font-medium text-foreground">Set up your profile to unlock your dashboard</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">Upload your resume so Pathway can match, tailor, and track applications for you.</p>
          <Link to="/profile" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_4px_11px_-5px_oklch(0.66_0.19_265_/_0.5)] hover:bg-[var(--primary-hover)]">
            Get started <ArrowRight className="size-4" />
          </Link>
        </div>
        </PageScrollArea>
      </PageLayout>
    );
  }

  if (query.isLoading) {
    return <PageLayout className="grid place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></PageLayout>;
  }
  if (query.isError || !query.data) {
    return (
      <PageLayout className="grid place-items-center text-center">
        <div>
          <p className="text-sm text-muted-foreground">{query.error instanceof BackendError ? query.error.message : 'Failed to load your dashboard.'}</p>
          <button onClick={() => query.refetch()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-muted"><RefreshCw className="size-3.5" /> Retry</button>
        </div>
      </PageLayout>
    );
  }

  const { stats, over_time, outcomes, top_matches, recently_applied } = query.data;
  const maxBar = Math.max(1, ...over_time.map((p) => p.count));
  const totalOutcomes = outcomes.reduce((s, o) => s + o.count, 0);

  const STAT_CARDS = [
    { label: 'Applications sent', value: String(stats.applications_sent), icon: Send },
    { label: 'Avg match', value: stats.avg_match ? `${stats.avg_match}%` : '—', icon: Target },
    { label: 'Interviews', value: String(stats.interviews), icon: CalendarCheck },
    { label: 'Offers', value: String(stats.offers), icon: Award },
  ];

  return (
    <PageLayout>
      <PageHeader title="Overview" />

      <PageScrollArea className="mt-5 pr-1">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAT_CARDS.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
            </div>
            <p className="mt-2 text-[28px] font-bold leading-none tracking-[-0.02em] text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* over time */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-[15px] font-semibold text-foreground">Applications over time</h2>
          <p className="text-xs text-muted-foreground">Last {over_time.length} weeks</p>
          <div className="mt-5 flex h-40 items-end gap-2">
            {over_time.map((p) => (
              <div key={p.label} className="flex h-full flex-1 flex-col justify-end gap-1.5">
                <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${(p.count / maxBar) * 82}%` }} title={`${p.count}`} />
                <span className="text-center text-[10px] text-muted-foreground">{p.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* outcomes */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-[15px] font-semibold text-foreground">Outcomes</h2>
          <div className="mt-4 flex items-center gap-5">
            <Donut outcomes={outcomes} total={totalOutcomes} />
            <div className="space-y-2">
              {outcomes.map((o) => (
                <div key={o.status} className="flex items-center gap-2 text-[13px]">
                  <span className="size-2.5 rounded-sm" style={{ background: OUTCOME_COLOR[o.status] }} />
                  <span className="text-muted-foreground">{OUTCOME_LABEL[o.status] ?? o.status}</span>
                  <span className="font-semibold text-foreground">{o.count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* top matches */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">Top matches</h2>
            <Link to="/jobs" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:opacity-80">Browse <ArrowRight className="size-3.5" /></Link>
          </div>
          <div className="mt-3 space-y-2">
            {top_matches.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">No scored matches yet.</p>
            ) : top_matches.map((m) => (
              <div key={m.job_posting_id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <div className="min-w-0"><p className="truncate text-[13px] font-medium text-foreground">{m.role}</p><p className="truncate text-xs text-muted-foreground">{m.company}{m.location ? ` · ${m.location}` : ''}</p></div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{m.match_score}%</span>
              </div>
            ))}
          </div>
        </section>

        {/* recently applied */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">Recently applied</h2>
            <Link to="/applications" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:opacity-80">View all <ArrowRight className="size-3.5" /></Link>
          </div>
          <div className="mt-3 space-y-2">
            {recently_applied.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">Nothing applied yet.</p>
            ) : recently_applied.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <div className="min-w-0"><p className="truncate text-[13px] font-medium text-foreground">{a.role}</p><p className="truncate text-xs text-muted-foreground">{a.company}</p></div>
                <span className="text-xs text-muted-foreground">{new Date(a.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      </PageScrollArea>
    </PageLayout>
  );
}
