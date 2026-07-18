import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ScoreRing } from '../../components/scoring/score-ring';
import { scoreMatch } from '../../api/jobs';
import type { BackendMatch, JobAnalysis } from '../../schemas/backend';

const labels = { matched: 'Matched', partial: 'Partial', missing: 'Missing', unknown: 'Unknown' } as const;

export function MatchView({ profileId, job, savedMatch, onScored }: { profileId: string; job: JobAnalysis; savedMatch: BackendMatch | null; onScored: (match: BackendMatch) => void }) {
  const mutation = useMutation({ mutationFn: () => scoreMatch(profileId, job), onSuccess: onScored });
  const match = mutation.data ?? savedMatch;
  if (!match) return <div className="step-stack"><div><p className="eyebrow">Candidate Evidence Agent</p><h2>Score verified evidence</h2><p>{job.requirements.length} requirements extracted by {job.provider} · {job.model}.</p></div>{mutation.isError ? <p className="form-error">{mutation.error.message}</p> : null}<Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? 'Matching verified facts…' : 'Calculate explainable score'}</Button></div>;
  return <div className="step-stack match-view"><div className="score-summary"><ScoreRing score={Math.round(match.score)} /><p>Job Copilot’s explainable match score</p><small>{match.scoring_version} · {match.provider} · {match.model}. This is not an employer ATS prediction.</small></div>{match.hard_gate_failures.length ? <div className="form-error"><AlertTriangle size={16} /> {match.hard_gate_failures.length} hard-gate requirement(s) are not matched.</div> : null}<section className="backend-match-items">{match.items.map((item) => <article key={item.requirement_id} className={`requirement-item ${item.classification}`}><div className="requirement-title">{item.classification === 'matched' ? <CheckCircle2 /> : item.classification === 'missing' ? <XCircle /> : <CircleHelp />}<strong>{item.requirement}</strong><span className="badge">{labels[item.classification]}</span></div><p>{item.reason}</p><small>{item.source_fact_ids.length} verified fact(s) · +{item.score_contribution.toFixed(1)} points · {Math.round(item.confidence * 100)}% confidence</small></article>)}</section></div>;
}
