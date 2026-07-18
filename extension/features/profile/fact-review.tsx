import { FactCard } from './fact-card';
import { useApplicationStore } from '../../stores/react';

export function FactReview() {
  const profile = useApplicationStore((state) => state.profile);
  const save = useApplicationStore((state) => state.setFactValue);
  const verify = useApplicationStore((state) => state.verifyFact);
  const reject = useApplicationStore((state) => state.rejectFact);
  const verified = profile.facts.filter((fact) => fact.verified).length;
  return <section><div className="section-heading"><div><p className="eyebrow">Candidate facts</p><h2>Review normalized facts</h2></div><strong>{verified}/{profile.facts.length} verified</strong></div><div className="fact-grid">{profile.facts.map((fact) => <FactCard key={fact.id} fact={fact} onSave={(value) => void save(fact.id, value)} onVerify={() => void verify(fact.id)} onReject={() => void reject(fact.id)} />)}</div></section>;
}
