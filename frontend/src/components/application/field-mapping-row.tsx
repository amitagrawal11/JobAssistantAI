import type { FillPlan } from '../../schemas/fill-plan';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { ConfidenceBadge } from './confidence-badge';

type Entry = FillPlan['entries'][number];

export function FieldMappingRow({ entry, onSelect, onAnswer }: { entry: Entry; onSelect: (selected: boolean) => void; onAnswer: (value: string) => void }) {
  const sensitive = entry.sensitivity !== 'none';
  const editable = sensitive || entry.confidence === 'low' || entry.confidence === 'unknown';
  return <article className={`field-row ${entry.status}`}>
    <Checkbox checked={entry.selected} disabled={!entry.proposedValue} aria-label={`Approve ${entry.label}`} onCheckedChange={(checked) => onSelect(checked === true)} />
    <div className="field-main"><div className="field-title"><strong>{entry.label}{entry.required && ' *'}</strong><ConfidenceBadge confidence={entry.confidence} sensitive={sensitive} /></div>
      {editable ? <Input value={entry.proposedValue ?? ''} placeholder={sensitive ? 'Answer explicitly or leave blank' : 'Complete manually'} onChange={(event) => onAnswer(event.target.value)} /> : <p>{entry.proposedValue ?? 'No proposed answer'}</p>}
      <small>{entry.sourceFactIds.length ? `Source: ${entry.sourceFactIds.join(', ')}` : sensitive ? 'Never inferred from profile data' : 'Source: reusable answer or manual input'} · {entry.status.replaceAll('_', ' ')}</small>
    </div>
  </article>;
}
