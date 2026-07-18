import { Badge } from '../ui/badge';
import type { CandidateFact } from '../../schemas/profile';

export function EvidenceRow({ facts }: { facts: CandidateFact[] }) {
  if (!facts.length) return <p className="evidence-empty">No verified candidate evidence</p>;
  return <div className="evidence-list">{facts.map((fact) => <div key={fact.id} className="evidence-row"><Badge>Verified</Badge><span>{fact.value}</span></div>)}</div>;
}
