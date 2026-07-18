import { useState } from 'react';
import { CheckCircle2, FileText, FormInput } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { useApplicationStore } from '../../stores/react';

export function ScanView({ readOnly = false }: { readOnly?: boolean }) {
  const job = useApplicationStore((state) => state.job);
  const editJobDescription = useApplicationStore((state) => state.editJobDescription);
  const [draft, setDraft] = useState(job.description);

  return <div className="step-stack">
    <div><p className="eyebrow">Current mock page</p><Card><CardContent><h2>{job.title}</h2><p>{job.company} · {job.location}</p><small>{job.sourceUrl}</small></CardContent></Card></div>
    <div><p className="eyebrow">Detected</p><div className="detected-grid"><span><CheckCircle2 size={16} /> Greenhouse</span><span><FileText size={16} /> Job description</span><span><FormInput size={16} /> Application form · {job.applicationFields.length} fields</span></div></div>
    <label className="field-label">Job description <Textarea readOnly={readOnly} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => !readOnly && void editJobDescription(draft)} /><span>{draft.length.toLocaleString()} characters · {readOnly ? 'Completed-step review' : 'Edited text is authoritative'}</span></label>
    <div className="inline-actions"><button type="button" className="text-action">Paste text instead</button><button type="button" className="text-action">Reset mock scan</button></div>
  </div>;
}
