import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { analyzeJob } from '../../api/jobs';
import type { JobAnalysis } from '../../schemas/backend';

export function ScanView({ profileId, savedJob, readOnly = false, onAnalyzed }: { profileId: string; savedJob: JobAnalysis | null; readOnly?: boolean; onAnalyzed: (job: JobAnalysis) => void }) {
  const [title, setTitle] = useState(savedJob?.title ?? ''); const [company, setCompany] = useState(savedJob?.company ?? ''); const [location, setLocation] = useState(savedJob?.location ?? ''); const [sourceUrl, setSourceUrl] = useState(savedJob?.source_url ?? ''); const [description, setDescription] = useState(savedJob?.description ?? '');
  const mutation = useMutation({ mutationFn: () => analyzeJob({ profile_id: profileId, title, company: company || undefined, location: location || undefined, source_url: sourceUrl || undefined, description }), onSuccess: onAnalyzed });
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate(); };
  return <form id="job-analysis-form" className="step-stack" onSubmit={submit}><div><p className="eyebrow">Job Analyst</p><h2>Paste the job you want to evaluate</h2><p>Job content is treated as untrusted data. Embedded instructions cannot change your provider or expose secrets.</p></div><div className="job-metadata-grid"><label className="field-label">Title<Input required readOnly={readOnly} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="field-label">Company<Input readOnly={readOnly} value={company} onChange={(event) => setCompany(event.target.value)} /></label><label className="field-label">Location<Input readOnly={readOnly} value={location} onChange={(event) => setLocation(event.target.value)} /></label><label className="field-label">Source URL<Input type="url" readOnly={readOnly} value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} /></label></div><label className="field-label">Job description<Textarea required minLength={20} readOnly={readOnly} value={description} onChange={(event) => setDescription(event.target.value)} /><span>{description.length.toLocaleString()} characters</span></label>{mutation.isError ? <p className="form-error" role="alert">{mutation.error.message}</p> : null}<Button type="submit" disabled={readOnly || mutation.isPending || title.length === 0 || description.length < 20}>{mutation.isPending ? 'Analyzing requirements…' : 'Analyze job'}</Button></form>;
}
