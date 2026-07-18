import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, MapPin } from 'lucide-react';
import type { BackendProfile } from '../../schemas/backend';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FactCard } from './fact-card';
import { useApplicationStore } from '../../stores/react';

type BackendFact = BackendProfile['facts'][number];

function BackendFactCard({
  fact,
  selected,
  pending,
  onSelect,
  onSave,
  onVerify,
}: {
  fact: BackendFact;
  selected: boolean;
  pending: boolean;
  onSelect: () => void;
  onSave: (value: string) => void;
  onVerify: () => void;
}) {
  const [value, setValue] = useState(fact.value);
  useEffect(() => setValue(fact.value), [fact.id, fact.value]);
  return (
    <article className={`fact-card backend-fact${selected ? ' selected' : ''}`} onClick={onSelect}>
      <div className="fact-status">
        {fact.verified ? <CheckCircle2 /> : <Circle />}
        <div><strong>{fact.key}</strong><small>{fact.category} · {fact.confidence === null ? 'Confidence unavailable' : `${Math.round(fact.confidence * 100)}% extraction confidence`}</small></div>
        <MapPin aria-label={`Source page ${fact.source.page ?? 1}`} />
      </div>
      <Input aria-label={fact.key} value={value} onClick={(event) => event.stopPropagation()} onChange={(event) => setValue(event.target.value)} onBlur={() => value !== fact.value && onSave(value)} />
      <div className="fact-actions">
        {fact.correction_version > 0 ? <small>Edited v{fact.correction_version}</small> : null}
        <Button size="sm" variant="secondary" disabled={fact.verified || pending} onClick={(event) => { event.stopPropagation(); onVerify(); }}>{fact.verified ? 'Verified' : 'Verify'}</Button>
      </div>
    </article>
  );
}

export function FactReview({
  backendProfile,
  selectedFactId,
  pendingFactId,
  onSelectFact,
  onSaveFact,
  onVerifyFact,
}: {
  backendProfile?: BackendProfile;
  selectedFactId?: string | null;
  pendingFactId?: string | null;
  onSelectFact?: (fact: BackendFact) => void;
  onSaveFact?: (fact: BackendFact, value: string) => void;
  onVerifyFact?: (fact: BackendFact) => void;
} = {}) {
  const mockProfile = useApplicationStore((state) => state.profile);
  const save = useApplicationStore((state) => state.setFactValue);
  const verify = useApplicationStore((state) => state.verifyFact);
  const reject = useApplicationStore((state) => state.rejectFact);
  if (backendProfile) {
    const verified = backendProfile.facts.filter((fact) => fact.verified).length;
    return <section className="backend-fact-review"><div className="section-heading"><div><p className="eyebrow">Candidate facts</p><h2>Check every extraction</h2></div><strong>{verified}/{backendProfile.facts.length} verified</strong></div><p className="review-guidance">Select a fact to locate its source. Edit incorrect values; edited facts must be verified again.</p><div className="fact-grid">{backendProfile.facts.map((fact) => <BackendFactCard key={fact.id} fact={fact} selected={selectedFactId === fact.id} pending={pendingFactId === fact.id} onSelect={() => onSelectFact?.(fact)} onSave={(value) => onSaveFact?.(fact, value)} onVerify={() => onVerifyFact?.(fact)} />)}</div></section>;
  }
  const verified = mockProfile.facts.filter((fact) => fact.verified).length;
  return <section><div className="section-heading"><div><p className="eyebrow">Candidate facts</p><h2>Review normalized facts</h2></div><strong>{verified}/{mockProfile.facts.length} verified</strong></div><div className="fact-grid">{mockProfile.facts.map((fact) => <FactCard key={fact.id} fact={fact} onSave={(value) => void save(fact.id, value)} onVerify={() => void verify(fact.id)} onReject={() => void reject(fact.id)} />)}</div></section>;
}
