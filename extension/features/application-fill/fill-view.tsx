import { Progress } from '../../components/ui/progress';
import { FieldMappingRow } from '../../components/application/field-mapping-row';
import { useApplicationStore } from '../../stores/react';

export function FillView({ readOnly = false }: { readOnly?: boolean }) {
  const plan = useApplicationStore((state) => state.fillPlan);
  const approve = useApplicationStore((state) => state.approveFieldEntry);
  const answer = useApplicationStore((state) => state.setFieldAnswer);
  const groups = [
    ['Ready to fill', (entry: typeof plan.entries[number]) => entry.confidence === 'high' && entry.sensitivity === 'none'],
    ['Review answer', (entry: typeof plan.entries[number]) => entry.confidence === 'medium'],
    ['Your input required', (entry: typeof plan.entries[number]) => entry.confidence === 'low' || entry.confidence === 'unknown' || entry.sensitivity !== 'none'],
  ] as const;
  const ready = plan.entries.filter((entry) => entry.proposedValue).length;
  return <div className={readOnly ? 'step-stack fill-view read-only' : 'step-stack fill-view'}><div><div className="section-heading"><p className="eyebrow">Application fields</p><strong>{ready}/{plan.entries.length}</strong></div><Progress value={Math.round((ready / plan.entries.length) * 100)} label="Application field readiness" /></div>{groups.map(([title, predicate]) => { const entries = plan.entries.filter(predicate); return <section key={title}><div className="section-heading"><h2>{title}</h2><strong>{entries.length}</strong></div><div className="field-list">{entries.map((entry) => <FieldMappingRow key={entry.fieldId} entry={entry} onSelect={(selected) => !readOnly && void approve(entry.fieldId, selected)} onAnswer={(value) => !readOnly && void answer(entry.fieldId, value)} />)}</div></section>; })}<label className="overwrite-option"><input type="checkbox" disabled /> Allow overwrite of selected fields <small>{readOnly ? 'Completed-step review' : 'Unavailable in Phase 1 simulation'}</small></label></div>;
}
