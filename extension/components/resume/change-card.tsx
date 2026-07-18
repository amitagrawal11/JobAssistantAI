import { ShieldCheck } from 'lucide-react';
import type { GeneratedDocuments } from '../../schemas/document';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

type Change = GeneratedDocuments['resume']['changes'][number];

export function ChangeCard({ change, onApprove, onReject }: { change: Change; onApprove: () => void; onReject: () => void }) {
  const unsupported = change.classification === 'NEW_CLAIM';
  return <article className={`change-card ${change.status}`}>
    <div className="change-heading"><div><Badge>{change.classification}</Badge><h3>{change.section}</h3></div><Badge>{change.status.replace('_', ' ')}</Badge></div>
    <div className="change-copy"><div><small>Before</small><p>{change.before}</p></div><div><small>After</small><p>{change.after}</p></div></div>
    <p className="change-reason">{change.reason}</p>
    <div className="evidence-note"><ShieldCheck size={15} /> {change.sourceFactIds.length} verified source fact{change.sourceFactIds.length === 1 ? '' : 's'}</div>
    {unsupported && <p className="danger-note">Unsupported new claims are rejected by default.</p>}
    <div className="change-actions"><Button size="sm" variant="secondary" onClick={onReject}>Reject</Button><Button size="sm" disabled={unsupported} onClick={onApprove}>Accept</Button></div>
  </article>;
}
