import { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import type { CandidateFact } from '../../schemas/profile';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export function FactCard({ fact, onSave, onVerify, onReject }: { fact: CandidateFact; onSave: (value: string) => void; onVerify: () => void; onReject: () => void }) {
  const [value, setValue] = useState(fact.value);
  return <article className="fact-card"><div className="fact-status">{fact.verified ? <CheckCircle2 /> : <Circle />}<div><strong>{fact.type}</strong><small>{Math.round(fact.confidence * 100)}% extraction confidence</small></div></div><Input value={value} onChange={(event) => setValue(event.target.value)} onBlur={() => value !== fact.value && onSave(value)} /><div className="fact-actions"><Button size="sm" variant="ghost" onClick={onReject}>Reject</Button><Button size="sm" variant="secondary" onClick={onVerify} disabled={fact.verified}>{fact.verified ? 'Verified' : 'Verify'}</Button></div></article>;
}
