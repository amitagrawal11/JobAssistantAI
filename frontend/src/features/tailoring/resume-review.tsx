import { A4Page } from '../../components/resume/a4-page';
import { ChangeCard } from '../../components/resume/change-card';
import { useApplicationStore } from '../../stores/react';

export function ResumeReview() {
  const resume = useApplicationStore((state) => state.documents.resume);
  const approve = useApplicationStore((state) => state.approveTailoredChange);
  const reject = useApplicationStore((state) => state.rejectTailoredChange);
  return <div className="document-review"><section className="change-column"><div className="section-heading"><h2>Tailored changes</h2><strong>{resume.changes.filter((change) => change.status === 'accepted').length}/{resume.changes.length} accepted</strong></div>{resume.changes.map((change) => <ChangeCard key={change.id} change={change} onApprove={() => void approve(change.id)} onReject={() => void reject(change.id)} />)}</section><section className="preview-canvas"><A4Page resume={resume} /><span>Page 1 of {resume.pageCount} · Phase 1 mock preview</span></section></div>;
}
