import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle, Check, CheckCircle2, Download, ExternalLink, FileText,
  Globe2, Highlighter, Loader2, Search, Sparkles, X,
} from 'lucide-react';
import { analyzeJob, extractJobUrl, scoreMatch } from '../api/jobs';
import {
  downloadGeneratedResume, getGeneratedResume, reviewDocumentChange, tailorDocuments,
} from '../api/tailoring';
import type { JobAnalysis } from '../schemas/backend';
import type { DocumentChange, GeneratedResume } from '../schemas/tailoring';
import { useActiveProfileId } from '../lib/active-profile';
import { BackendError } from '../api/client';
import { PageHeader } from '../components/page-header';
import { PageLayout, PageScrollArea } from '../components/page-layout';
import { JobDescriptionEditor } from '../features/tailor/job-description-editor';
import { BasicA4Resume } from '../features/tailor/basic-a4-resume';

type SourceMode = 'url' | 'paste';
type ReviewTab = 'changes' | 'keywords' | 'job';
type ReviewFilter = 'all' | 'proposed' | 'approved' | 'rejected';
type Workspace = {
  analysis: JobAnalysis;
  resume: GeneratedResume;
  originalScore: number | null;
};

const classificationLabel: Record<string, string> = {
  REPHRASED: 'Rephrased',
  REORDERED: 'Reordered',
  EMPHASIZED: 'Emphasized',
  NEW_CLAIM: 'Needs evidence',
  REMOVED: 'Removed',
};

function message(error: unknown, fallback: string) {
  return error instanceof BackendError ? error.message : fallback;
}

function JobInput({ onReady }: { onReady: (analysis: JobAnalysis) => void }) {
  const activeProfileId = useActiveProfileId();
  const [mode, setMode] = useState<SourceMode>('url');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState(
    () => window.localStorage.getItem('tailor-job-description-draft') ?? '',
  );
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(
      () => window.localStorage.setItem('tailor-job-description-draft', description),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [description]);

  const extract = useMutation({
    mutationFn: () => extractJobUrl(url.trim()),
    onSuccess: (result) => {
      setDescription(result.description);
      setSourceUrl(result.source_url);
    },
  });
  const analyze = useMutation({
    mutationFn: () => analyzeJob({ profile_id: activeProfileId as string, description: description.trim() }),
    onSuccess: onReady,
  });

  if (!activeProfileId) {
    return (
      <PageLayout className="mx-auto max-w-[860px]">
        <PageHeader title="Tailor resume" description="Create a verified resume profile before tailoring it to a job." />
        <PageScrollArea className="mt-5">
          <div className="tailor-empty-gate">
            <AlertCircle />
            <h2>Create your resume profile first</h2>
            <p>Tailor uses the verified experience and skills from My Resume.</p>
          </div>
        </PageScrollArea>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="mx-auto max-w-[1080px]">
      <PageHeader
        title="Tailor resume"
        description="Add a job description. Review every evidence-backed change before downloading your A4 resume."
      />
      <PageScrollArea className="mt-5 pr-1">
        <section className="tailor-input-card">
          <div className="tailor-source-tabs" role="tablist" aria-label="Job source">
            <button role="tab" aria-selected={mode === 'url'} onClick={() => setMode('url')}>
              <Globe2 /> Job URL
            </button>
            <button role="tab" aria-selected={mode === 'paste'} onClick={() => setMode('paste')}>
              <FileText /> Paste description
            </button>
          </div>

          {mode === 'url' ? (
            <div className="tailor-url-row">
              <label>
                Public job URL
                <span className="tailor-url-control">
                  <input value={url} onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://company.com/jobs/senior-engineer" disabled={extract.isPending || analyze.isPending} />
                  <button onClick={() => extract.mutate()} disabled={!/^https?:\/\//i.test(url.trim()) || extract.isPending}>
                    {extract.isPending ? <Loader2 className="animate-spin" /> : <Search />} Fetch job
                  </button>
                </span>
              </label>
              {extract.isError ? (
                <div className="tailor-error">
                  <AlertCircle />
                  <span>{message(extract.error, 'We could not read this page. Paste the description instead.')}</span>
                  <button onClick={() => setMode('paste')}>Paste description</button>
                </div>
              ) : null}
              {sourceUrl ? <p className="tailor-source-success"><CheckCircle2 /> Job text loaded. Review and correct it below.</p> : null}
            </div>
          ) : null}

          <div className="tailor-editor-heading">
            <div>
              <h2>Job description</h2>
              <p>{sourceUrl ? 'Extracted from the job URL. Check that the responsibilities and requirements are complete.' : 'Paste the complete posting with its section and bullet structure.'}</p>
            </div>
            {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer"><ExternalLink /> Source</a> : null}
          </div>
          <JobDescriptionEditor value={description} onChange={(value) => {
            setDescription(value);
            if (value !== description && sourceUrl) setSourceUrl(null);
          }} disabled={analyze.isPending} />

          {analyze.isError ? <div className="tailor-error"><AlertCircle />{message(analyze.error, 'The job could not be analyzed.')}</div> : null}
          <footer className="tailor-input-actions">
            <div><CheckCircle2 /> Uses your active, verified resume profile</div>
            <button className="tailor-primary-button" onClick={() => analyze.mutate()}
              disabled={description.trim().length < 40 || analyze.isPending}>
              {analyze.isPending ? <><Loader2 className="animate-spin" /> Analyzing job…</> : <><Sparkles /> Analyze job</>}
            </button>
          </footer>
        </section>
      </PageScrollArea>
    </PageLayout>
  );
}

function JobConfirmation({ analysis, onBack, onTailored }: {
  analysis: JobAnalysis;
  onBack: () => void;
  onTailored: (workspace: Workspace) => void;
}) {
  const activeProfileId = useActiveProfileId();
  const tailor = useMutation({
    mutationFn: async () => {
      const [result, match] = await Promise.all([
        tailorDocuments(activeProfileId as string, analysis.job_id),
        scoreMatch(activeProfileId as string, analysis).catch(() => null),
      ]);
      return {
        analysis,
        resume: await getGeneratedResume(result.resume.id),
        originalScore: match ? Math.round(match.score) : null,
      };
    },
    onSuccess: onTailored,
  });
  const required = analysis.requirements.filter((item) => item.required).length;

  return (
    <PageLayout className="mx-auto max-w-[960px]">
      <PageHeader title="Confirm the job" description="Check the extracted role before it changes your resume."
        backLabel="Tailor Assistant" onBack={onBack} />
      <PageScrollArea className="mt-5">
        <section className="tailor-confirm-card">
          <div className="tailor-confirm-title">
            <div><span>Role</span><h2>{analysis.title}</h2><p>{analysis.company ?? 'Company not detected'}{analysis.location ? ` · ${analysis.location}` : ''}</p></div>
            <div className="tailor-requirement-count"><strong>{analysis.requirements.length}</strong><span>requirements</span></div>
          </div>
          <div className="tailor-confirm-stats">
            <span><strong>{required}</strong> required</span>
            <span><strong>{analysis.requirements.length - required}</strong> preferred or contextual</span>
            <span><strong>{analysis.description.split(/\s+/).length}</strong> words analyzed</span>
          </div>
          <details>
            <summary>View extracted description</summary>
            <pre>{analysis.description}</pre>
          </details>
          {tailor.isPending ? (
            <div className="tailor-progress" aria-live="polite">
              {['Reading job requirements', 'Comparing verified experience', 'Drafting supported changes', 'Laying out A4 resume'].map((label, index) => (
                <div key={label} className={index === 0 ? 'is-active' : ''}>
                  {index === 0 ? <Loader2 className="animate-spin" /> : <span>{index + 1}</span>}{label}
                </div>
              ))}
            </div>
          ) : null}
          {tailor.isError ? <div className="tailor-error"><AlertCircle />{message(tailor.error, 'Tailoring failed. Your job description is preserved.')}</div> : null}
          <footer>
            <button className="tailor-secondary-button" onClick={onBack} disabled={tailor.isPending}>Edit description</button>
            <button className="tailor-primary-button" onClick={() => tailor.mutate()} disabled={tailor.isPending}>
              {tailor.isPending ? <><Loader2 className="animate-spin" /> Tailoring…</> : <><Sparkles /> Tailor resume</>}
            </button>
          </footer>
        </section>
      </PageScrollArea>
    </PageLayout>
  );
}

function keywords(workspace: Workspace) {
  const job = workspace.analysis.requirements.map((item) => item.normalized_text.toLowerCase());
  const source = workspace.resume.source.sections.flatMap((section) => section.items).map((item) => item.value.toLowerCase()).join(' ');
  const current = workspace.resume.current.sections.flatMap((section) => section.items).map((item) => item.value.toLowerCase()).join(' ');
  const label = (text: string) => text.split(/\s+/).filter((word) => word.length > 3).slice(0, 5).join(' ');
  return {
    covered: job.filter((term) => term.split(/\s+/).some((word) => word.length > 3 && source.includes(word))).map(label),
    added: job.filter((term) => !source.includes(label(term)) && current.includes(label(term))).map(label),
    missing: job.filter((term) => !term.split(/\s+/).some((word) => word.length > 3 && current.includes(word))).map(label),
    removed: workspace.resume.changes.filter((change) => change.classification === 'REMOVED' && change.status === 'approved').map((change) => change.before),
  };
}

function ReviewWorkspace({ initial, onStartOver }: { initial: Workspace; onStartOver: () => void }) {
  const [workspace, setWorkspace] = useState(initial);
  const [tab, setTab] = useState<ReviewTab>('changes');
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [selected, setSelected] = useState<DocumentChange | null>(null);
  const [showChanges, setShowChanges] = useState(true);
  const [mobilePane, setMobilePane] = useState<'review' | 'preview'>('review');

  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => reviewDocumentChange(id, status),
    onSuccess: async () => {
      const resume = await getGeneratedResume(workspace.resume.id);
      setWorkspace((value) => ({ ...value, resume }));
    },
  });
  const download = useMutation({ mutationFn: () => downloadGeneratedResume(workspace.resume.id) });
  const changes = filter === 'all' ? workspace.resume.changes : workspace.resume.changes.filter((change) => change.status === filter);
  const keywordGroups = useMemo(() => keywords(workspace), [workspace]);
  const focusedFactIds = new Set(selected?.source_fact_ids ?? []);

  return (
    <PageLayout>
      <PageHeader
        title={workspace.analysis.title}
        description={`${workspace.analysis.company ?? 'Unknown company'}${workspace.analysis.location ? ` · ${workspace.analysis.location}` : ''}`}
        backLabel="Tailor resume"
        onBack={onStartOver}
        actions={(
          <>
            {workspace.originalScore != null ? <span className="tailor-score">{workspace.originalScore}% match</span> : null}
            <button className="tailor-primary-button" onClick={() => download.mutate()} disabled={download.isPending}>
              {download.isPending ? <Loader2 className="animate-spin" /> : <Download />} Download PDF
            </button>
          </>
        )}
      />
      <div className="tailor-mobile-switch" role="tablist">
        <button aria-selected={mobilePane === 'review'} onClick={() => setMobilePane('review')}>Review</button>
        <button aria-selected={mobilePane === 'preview'} onClick={() => setMobilePane('preview')}>Preview</button>
      </div>
      {download.isError ? <div className="tailor-error"><AlertCircle />{message(download.error, 'The PDF could not be generated.')}</div> : null}
      <div className="tailor-workspace">
        <section className={`tailor-review-pane ${mobilePane === 'review' ? 'is-mobile-active' : ''}`}>
          <div className="tailor-review-tabs" role="tablist">
            <button aria-selected={tab === 'changes'} onClick={() => setTab('changes')}>Changes <span>{workspace.resume.changes.length}</span></button>
            <button aria-selected={tab === 'keywords'} onClick={() => setTab('keywords')}>Keywords</button>
            <button aria-selected={tab === 'job'} onClick={() => setTab('job')}>Job</button>
          </div>
          <div className="tailor-review-scroll">
            {tab === 'changes' ? (
              <>
                <div className="tailor-filter-row">
                  {(['all', 'proposed', 'approved', 'rejected'] as const).map((value) => (
                    <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
                      {value === 'proposed' ? 'Needs review' : value[0].toUpperCase() + value.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="tailor-change-list">
                  {changes.map((change) => (
                    <article key={change.id} className={`tailor-change-card is-${change.status}`}
                      onClick={() => setSelected(change === selected ? null : change)}>
                      <header>
                        <span className={`tailor-change-kind is-${change.classification.toLowerCase()}`}>{classificationLabel[change.classification]}</span>
                        <span>{change.section}</span>
                      </header>
                      {change.before ? <div className="tailor-before"><small>Before</small><p>{change.before}</p></div> : null}
                      <div className="tailor-after"><small>After</small><p>{change.after}</p></div>
                      <p className="tailor-change-reason">{change.reason}</p>
                      {!change.supported ? <p className="tailor-unsupported"><AlertCircle /> No verified evidence. This change cannot be accepted.</p> : null}
                      <footer>
                        {change.status !== 'proposed' ? <span>{change.status === 'approved' ? 'Accepted' : 'Dismissed'}</span> : <span />}
                        <button onClick={(event) => {
                          event.stopPropagation();
                          review.mutate({ id: change.id, status: change.status === 'approved' ? 'rejected' : 'approved' });
                        }} disabled={review.isPending || (!change.supported && change.status !== 'approved')}
                          title={change.status === 'approved' ? 'Undo acceptance' : 'Accept change'}>
                          <Check /> {change.status === 'approved' ? 'Undo' : 'Accept'}
                        </button>
                        {change.status !== 'rejected' ? (
                          <button onClick={(event) => {
                            event.stopPropagation();
                            review.mutate({ id: change.id, status: 'rejected' });
                          }} disabled={review.isPending}><X /> Dismiss</button>
                        ) : null}
                      </footer>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
            {tab === 'keywords' ? (
              <div className="tailor-keyword-groups">
                {([
                  ['Covered', keywordGroups.covered, 'covered'],
                  ['Added by accepted changes', keywordGroups.added, 'added'],
                  ['Missing — no evidence found', keywordGroups.missing, 'missing'],
                  ['Removed', keywordGroups.removed, 'removed'],
                ] as const).map(([title, items, kind]) => (
                  <section key={kind}><h3>{title}<span>{items.length}</span></h3>
                    <div>{items.length ? items.map((item, index) => <span className={`is-${kind}`} key={`${item}-${index}`}>{item}</span>) : <p>None</p>}</div>
                  </section>
                ))}
              </div>
            ) : null}
            {tab === 'job' ? (
              <div className="tailor-job-review">
                <h3>{workspace.analysis.title}</h3>
                <p>{workspace.analysis.company ?? 'Company not detected'}{workspace.analysis.location ? ` · ${workspace.analysis.location}` : ''}</p>
                <h4>Requirements</h4>
                <ul>{workspace.analysis.requirements.map((item) => <li key={item.requirement_id}>{item.normalized_text}</li>)}</ul>
                <details><summary>Full job description</summary><pre>{workspace.analysis.description}</pre></details>
              </div>
            ) : null}
          </div>
        </section>
        <section className={`tailor-preview-pane ${mobilePane === 'preview' ? 'is-mobile-active' : ''}`}>
          <div className="tailor-preview-toolbar">
            <div><FileText /><strong>Basic A4</strong><span>· 1 template</span></div>
            <button aria-pressed={showChanges} onClick={() => setShowChanges((value) => !value)}>
              <Highlighter /> {showChanges ? 'Show clean preview' : 'Show changes'}
            </button>
          </div>
          <div className="tailor-preview-canvas">
            <BasicA4Resume resume={workspace.resume.current} focusedFactIds={focusedFactIds} showChanges={showChanges} />
          </div>
          <footer className="tailor-preview-note">
            <CheckCircle2 /> The PDF uses this A4 content, template, fonts, and physical margins. Review highlights are never exported.
          </footer>
        </section>
      </div>
    </PageLayout>
  );
}

export function TailorPage() {
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  if (workspace) return <ReviewWorkspace initial={workspace} onStartOver={() => { setWorkspace(null); setAnalysis(null); }} />;
  if (analysis) return <JobConfirmation analysis={analysis} onBack={() => setAnalysis(null)} onTailored={setWorkspace} />;
  return <JobInput onReady={setAnalysis} />;
}
