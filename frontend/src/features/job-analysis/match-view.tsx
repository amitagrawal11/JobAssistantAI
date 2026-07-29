import { AlertTriangle, CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import { ScoreRing } from '../../components/scoring/score-ring';
import type { BackendMatch } from '../../schemas/backend';

const labels = { matched: 'Matched', partial: 'Partial', missing: 'Missing', unknown: 'Unknown' } as const;

export function MatchView({ match }: { match: BackendMatch }) {
  return <div className="step-stack match-view"><div className="score-summary"><ScoreRing score={Math.round(match.score)} /><p>Job Copilot’s explainable match score</p><small>{match.scoring_version} · {match.provider} · {match.model}. This is not an employer ATS prediction.</small></div>{match.hard_gate_failures.length ? <div className="form-error"><AlertTriangle size={16} /> {match.hard_gate_failures.length} hard-gate requirement(s) are not matched.</div> : null}<section className="backend-match-items">{match.items.map((item) => <article key={item.requirement_id} className={`requirement-item ${item.classification}`}><div className="requirement-title">{item.classification === 'matched' ? <CheckCircle2 /> : item.classification === 'missing' ? <XCircle /> : <CircleHelp />}<strong>{item.requirement}</strong><span className="badge">{labels[item.classification]}</span></div><p>{item.reason}</p><small>+{item.score_contribution.toFixed(1)} points · {Math.round(item.confidence * 100)}% confidence</small></article>)}</section></div>;
}
