import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Check, X, Loader2, AlertCircle, FileText, Send } from 'lucide-react';
import { analyzeJob, scoreMatch } from '../api/jobs';
import { tailorDocuments, reviewDocumentChange } from '../api/tailoring';
import { createApplication } from '../api/applications';
import type { DocumentChange, DocumentTailorResponse } from '../schemas/tailoring';
import type { JobAnalysis } from '../schemas/backend';
import { useActiveProfileId } from '../lib/active-profile';
import { BackendError } from '../api/client';
import { PageHeader } from '../components/page-header';
import { PageLayout, PageScrollArea } from '../components/page-layout';

const CLASS_TONE: Record<string, string> = {
  REPHRASED: 'bg-primary/10 text-primary',
  REORDERED: 'bg-primary/10 text-primary',
  EMPHASIZED: 'bg-amber-50 text-amber-700',
  NEW_CLAIM: 'bg-emerald-50 text-emerald-700',
  REMOVED: 'bg-rose-50 text-rose-700',
};

type Tailored = { analysis: JobAnalysis; tailor: DocumentTailorResponse; score: number | null };

function Setup({ onDone }: { onDone: (t: Tailored) => void }) {
  const activeProfileId = useActiveProfileId();
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');

  const run = useMutation({
    mutationFn: async (): Promise<Tailored> => {
      const pid = activeProfileId as string;
      const analysis = await analyzeJob({ profile_id: pid, description: description.trim() });
      const [tailor, match] = await Promise.all([
        tailorDocuments(pid, analysis.job_id),
        scoreMatch(pid, analysis).catch(() => null),
      ]);
      return { analysis, tailor, score: match ? Math.round(match.score) : null };
    },
    onSuccess: onDone,
  });

  if (!activeProfileId) {
    return (
      <PageLayout className="mx-auto max-w-[760px]">
        <PageHeader
          title="Tailor your resume to a role"
          description="Paste a job description — Pathway analyzes it and proposes evidence-backed edits."
        />
        <PageScrollArea className="mt-5 pr-1">
        <div className="grid min-h-[280px] place-items-center rounded-2xl border border-dashed border-border">
          <div className="text-center">
            <AlertCircle className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">Create a profile first</p>
            <p className="mt-1 text-xs text-muted-foreground">Tailoring needs your resume. Set it up on the My Resume page.</p>
          </div>
        </div>
        </PageScrollArea>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="mx-auto max-w-[760px]">
      <PageHeader
        title="Tailor your resume to a role"
        description="Paste a job description — Pathway analyzes it and proposes evidence-backed edits."
      />

      <PageScrollArea className="mt-5 pr-1">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[13px] font-medium text-foreground">Role title <span className="text-muted-foreground">(optional)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Product Designer" disabled={run.isPending}
              className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]" />
          </label>
          <label className="block text-[13px] font-medium text-foreground">Company <span className="text-muted-foreground">(optional)</span>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Northwind Labs" disabled={run.isPending}
              className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]" />
          </label>
        </div>
        <label className="mt-4 block text-[13px] font-medium text-foreground">Job description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={10} disabled={run.isPending}
            placeholder="Paste the full job description here…"
            className="mt-1.5 w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-[var(--ring)]" />
        </label>

        {run.isError ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{run.error instanceof BackendError ? run.error.message : 'Tailoring failed. Please try again.'}</p>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <button onClick={() => run.mutate()} disabled={description.trim().length < 40 || run.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_4px_11px_-5px_oklch(0.66_0.19_265_/_0.5)] hover:bg-[var(--primary-hover)] disabled:opacity-50">
            {run.isPending ? <><Loader2 className="size-4 animate-spin" /> Tailoring…</> : <><Sparkles className="size-4" /> Analyze &amp; tailor</>}
          </button>
          {run.isPending ? <span className="text-[13px] text-muted-foreground">Analyzing the role and rewriting your resume — this can take a minute or two.</span>
            : <span className="text-[13px] text-muted-foreground">Paste at least a paragraph to begin.</span>}
        </div>
      </section>
      </PageScrollArea>
    </PageLayout>
  );
}

function Review({ tailored, onReset }: { tailored: Tailored; onReset: () => void }) {
  const activeProfileId = useActiveProfileId();
  const { analysis, tailor, score } = tailored;
  const [changes, setChanges] = useState<DocumentChange[]>(tailor.resume.changes);
  const [submitted, setSubmitted] = useState(false);

  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => reviewDocumentChange(id, status),
    onSuccess: (res) => setChanges((cs) => cs.map((c) => (c.id === res.id ? { ...c, status: res.status } : c))),
  });

  const submit = useMutation({
    mutationFn: () => createApplication({
      profile_id: activeProfileId as string,
      role: analysis.title,
      company: analysis.company ?? 'Unknown',
      location: analysis.location,
      match_score: score,
      source: 'tailored',
    }),
    onSuccess: () => setSubmitted(true),
  });

  const pending = changes.filter((c) => c.status === 'proposed');
  const accepted = changes.filter((c) => c.status === 'approved');

  return (
    <PageLayout>
      <PageHeader
        title={analysis.title}
        description={`${analysis.company ?? 'Unknown company'}${analysis.location ? ` · ${analysis.location}` : ''}`}
        backLabel="Tailor Assistant"
        onBack={onReset}
        actions={(
          <>
          {score != null ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[13px] font-bold text-emerald-700">{score}% match</span> : null}
          <button onClick={() => submit.mutate()} disabled={submit.isPending || submitted}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_4px_11px_-5px_oklch(0.66_0.19_265_/_0.5)] hover:bg-[var(--primary-hover)] disabled:opacity-60">
            {submitted ? <><Check className="size-4" /> Submitted</> : submit.isPending ? <><Loader2 className="size-4 animate-spin" /> Submitting…</> : <><Send className="size-4" /> Approve &amp; Submit</>}
          </button>
          </>
        )}
      />

      <PageScrollArea className="mt-5 pr-1">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,0.85fr)_1.15fr]">
        {/* changes */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-[15px] font-semibold text-foreground"><Sparkles className="size-4 text-primary" /> Changes for this role</h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[12px] font-bold text-primary">{pending.length}</span>
          </div>
          <div className="mt-3 space-y-2.5">
            {changes.length === 0 ? <p className="py-6 text-center text-[13px] text-muted-foreground">No changes were proposed.</p> : null}
            {changes.map((c) => (
              <div key={c.id} className={'rounded-xl border p-3 transition-colors ' + (c.status === 'approved' ? 'border-emerald-200 bg-emerald-50/40' : c.status === 'rejected' ? 'border-border bg-muted/40 opacity-60' : 'border-border')}>
                <div className="flex items-start justify-between gap-2">
                  <span className={'rounded-md px-2 py-0.5 text-[11px] font-bold ' + (CLASS_TONE[c.classification] ?? 'bg-muted text-muted-foreground')}>{c.classification}</span>
                  {c.status !== 'proposed' ? (
                    <span className="text-[12px] font-semibold text-muted-foreground">{c.status === 'approved' ? 'Accepted' : 'Dismissed'} · <button className="text-primary hover:underline" onClick={() => review.mutate({ id: c.id, status: c.status === 'approved' ? 'rejected' : 'approved' })}>Undo</button></span>
                  ) : (
                    <div className="flex gap-1.5">
                      <button title="Accept" onClick={() => review.mutate({ id: c.id, status: 'approved' })} disabled={review.isPending} className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><Check className="size-4" /></button>
                      <button title="Reject" onClick={() => review.mutate({ id: c.id, status: 'rejected' })} disabled={review.isPending} className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-foreground/10 hover:text-foreground"><X className="size-4" /></button>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c.section}</p>
                {c.before ? <p className="mt-1 text-[13px] leading-snug text-rose-700 line-through">{c.before}</p> : null}
                <p className="mt-1 text-[13px] font-medium leading-snug text-foreground">{c.after}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.reason}</p>
              </div>
            ))}
          </div>
        </section>

        {/* tailored preview */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-[15px] font-semibold text-foreground"><FileText className="size-4 text-primary" /> Tailored preview</h2>
            <span className="text-[12px] text-muted-foreground">{accepted.length} of {changes.length} applied</span>
          </div>
          <div className="mt-3 flex justify-center rounded-xl bg-muted/40 p-4">
            <div className="aspect-[210/297] w-full max-w-[520px] overflow-y-auto rounded-md bg-white px-7 py-8 shadow-[0_10px_30px_-12px_rgb(22_24_42/0.25)]">
              <h3 className="text-[20px] font-bold tracking-[-0.02em] text-[oklch(0.2_0.01_60)]">Tailored resume</h3>
              <p className="text-sm text-muted-foreground">For {analysis.title}{analysis.company ? ` · ${analysis.company}` : ''}</p>
              <div className="mt-4 space-y-3">
                {accepted.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">Accept changes on the left to build your tailored resume.</p>
                ) : accepted.map((c) => (
                  <div key={c.id} className="rounded-md border-l-2 border-emerald-400 bg-emerald-50/60 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.section}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-foreground">{c.after}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Generated by {tailor.provider} · {tailor.model}</p>
        </section>
      </div>
      </PageScrollArea>
    </PageLayout>
  );
}

export function TailorPage() {
  const [tailored, setTailored] = useState<Tailored | null>(null);
  return tailored
    ? <Review tailored={tailored} onReset={() => setTailored(null)} />
    : <Setup onDone={setTailored} />;
}
