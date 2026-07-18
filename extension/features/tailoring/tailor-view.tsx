import { FileText, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Button } from '../../components/ui/button';
import { openDashboard } from '../shared/open-dashboard';
import { useApplicationStore } from '../../stores/react';

export function TailorView() {
  const documents = useApplicationStore((state) => state.documents);
  const approve = useApplicationStore((state) => state.approveTailoredChange);
  const reject = useApplicationStore((state) => state.rejectTailoredChange);
  return <div className="step-stack">
    <div><p className="eyebrow">Application package</p><div className="package-grid"><Card><CardContent><FileText /><div><strong>Resume</strong><span>{documents.resume.changes.length} changes · ATS-safe · {documents.resume.pageCount} pages</span></div><Button size="sm" variant="secondary" onClick={() => void openDashboard('documents')}>Review A4 resume</Button></CardContent></Card><Card><CardContent><FileText /><div><strong>Cover letter</strong><span>Drafted · {documents.coverLetter.wordCount} words</span></div><Button size="sm" variant="secondary" onClick={() => void openDashboard('documents')}>Review cover letter</Button></CardContent></Card></div></div>
    <section><p className="eyebrow">Proposed changes</p><div className="compact-change-list">{documents.resume.changes.map((change) => <label key={change.id}><Checkbox checked={change.status === 'accepted'} onChange={(event) => void (event.target.checked ? approve(change.id) : reject(change.id))} /><span><strong>{change.after}</strong><small>{change.classification} · {change.sourceFactIds.length} verified facts</small></span></label>)}</div></section>
    <p className="truth-note"><ShieldCheck size={16} /> Every rewrite uses verified candidate facts.</p>
  </div>;
}
