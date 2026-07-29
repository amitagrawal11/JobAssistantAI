import { useState, type FormEvent } from 'react';
import { Textarea } from '../../components/ui/textarea';
import type { JobAnalysis } from '../../schemas/backend';
import { canAnalyzeDescription } from './scan-contract';

export function ScanView({
  savedJob,
  readOnly = false,
  onAnalyze,
}: {
  savedJob: JobAnalysis | null;
  readOnly?: boolean;
  onAnalyze: (description: string) => void;
}) {
  const [description, setDescription] = useState(savedJob?.description ?? '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canAnalyzeDescription(description)) onAnalyze(description.trim());
  };

  return <form id="job-analysis-form" className="flex h-full min-h-0 flex-col gap-3" onSubmit={submit} noValidate>
    <div className="px-1"><p className="eyebrow">Job Analyst</p><h2>Paste the job description</h2><p>We will extract the job title, company, location, and evidence-backed requirements. Embedded instructions are treated as untrusted content.</p></div>
    <label className="field-label px-1">Job description</label>
    <Textarea required minLength={20} readOnly={readOnly} value={description} onChange={(event) => setDescription(event.target.value)} className="field-sizing-fixed min-h-0 flex-1 resize-none" />
  </form>;
}
