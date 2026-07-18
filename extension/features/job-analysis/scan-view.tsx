import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { analyzeJob } from '../../api/jobs';
import type { JobAnalysis } from '../../schemas/backend';
import { canAnalyzeDescription } from './scan-contract';

export function ScanView({
  profileId,
  savedJob,
  readOnly = false,
  onAnalyzed,
}: {
  profileId: string;
  savedJob: JobAnalysis | null;
  readOnly?: boolean;
  onAnalyzed: (job: JobAnalysis) => void;
}) {
  const [description, setDescription] = useState(savedJob?.description ?? '');
  const mutation = useMutation({
    mutationFn: () => analyzeJob({
      profile_id: profileId,
      description: description.trim(),
    }),
    onSuccess: onAnalyzed,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canAnalyzeDescription(description)) mutation.mutate();
  };

  return <form id="job-analysis-form" className="step-stack" onSubmit={submit}>
    <div><p className="eyebrow">Job Analyst</p><h2>Paste the job description</h2><p>We will extract the job title, company, location, and evidence-backed requirements. Embedded instructions are treated as untrusted content.</p></div>
    <label className="field-label">Job description
      <Textarea required minLength={20} readOnly={readOnly} value={description} onChange={(event) => setDescription(event.target.value)} />
      <span>{description.trim().length.toLocaleString()} characters</span>
    </label>
    {mutation.isError ? <p className="form-error" role="alert">{mutation.error.message}</p> : null}
    <Button type="submit" disabled={readOnly || mutation.isPending || !canAnalyzeDescription(description)}>{mutation.isPending ? 'Analyzing job…' : 'Analyze job'}</Button>
  </form>;
}
