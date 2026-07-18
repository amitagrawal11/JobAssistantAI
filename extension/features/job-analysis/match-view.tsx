import { CheckCircle2 } from 'lucide-react';
import { ScoreRing } from '../../components/scoring/score-ring';
import { RequirementGroup } from '../../components/scoring/requirement-group';
import { useApplicationStore } from '../../stores/react';

export function MatchView() {
  const match = useApplicationStore((state) => state.matchResult);
  const facts = useApplicationStore((state) => state.profile.facts);
  const groups = [
    ['Matched requirements', 'matched'], ['Partial matches', 'partial'],
    ['Missing requirements', 'missing'], ['Unknown · needs confirmation', 'unknown'],
  ] as const;
  const hardGates = match.items.filter((item) => item.hardGate);

  return <div className="step-stack match-view">
    <div className="score-summary"><ScoreRing score={match.score} /><p>{match.summary}</p><small>This is Job Copilot’s explainable Phase 1 mock score—not an employer ATS prediction.</small></div>
    <section><div className="section-heading"><h2>Hard gates</h2><strong>{hardGates.filter((item) => item.classification === 'matched').length}/{hardGates.length}</strong></div>{hardGates.map((item) => <div className="hard-gate" key={item.id}><CheckCircle2 size={17} />{item.requirement}</div>)}</section>
    <section className="requirement-groups">{groups.map(([title, classification]) => <RequirementGroup key={classification} title={title} items={match.items.filter((item) => item.classification === classification)} facts={facts} />)}</section>
  </div>;
}
