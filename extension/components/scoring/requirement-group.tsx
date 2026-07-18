import { ChevronDown } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { MatchResult } from '../../schemas/match';
import type { CandidateFact } from '../../schemas/profile';
import { EvidenceRow } from './evidence-row';

type MatchItem = MatchResult['items'][number];

export function RequirementGroup({ title, items, facts }: { title: string; items: MatchItem[]; facts: CandidateFact[] }) {
  return <details className="requirement-group" open={title === 'Matched requirements'}>
    <summary><span>{title}</span><Badge>{items.length}</Badge><ChevronDown size={16} /></summary>
    <div>{items.map((item) => <article key={item.id} className={`requirement-item ${item.classification}`}>
      <div className="requirement-title"><strong>{item.requirement}</strong><Badge>{item.classification}</Badge></div>
      <p>{item.reason}</p><EvidenceRow facts={facts.filter((fact) => item.sourceFactIds.includes(fact.id))} />
      <small>Mock score contribution: {item.scoreContribution} points</small>
    </article>)}</div>
  </details>;
}
