import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { ResumeReview } from '../tailoring/resume-review';
import { CoverLetterReview } from '../tailoring/cover-letter-review';

export function DocumentsPage() {
  const [view, setView] = useState<'resume' | 'cover'>('resume');
  return <><div className="page-heading"><div><p className="eyebrow">Application documents</p><h1>{view === 'resume' ? 'Tailored resume' : 'Cover letter'}</h1><p>Northstar Labs · Senior Frontend Engineer</p></div><div className="segmented"><Button size="sm" variant={view === 'resume' ? 'primary' : 'secondary'} onClick={() => setView('resume')}>Resume</Button><Button size="sm" variant={view === 'cover' ? 'primary' : 'secondary'} onClick={() => setView('cover')}>Cover letter</Button><Button size="sm" disabled>Download PDF</Button></div></div>{view === 'resume' ? <ResumeReview /> : <CoverLetterReview />}</>;
}
