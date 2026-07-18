import { FileText } from 'lucide-react';
import { ReadinessSummary } from '../../components/application/readiness-summary';
import { Button } from '../../components/ui/button';
import { useApplicationStore } from '../../stores/react';
import { openDashboard } from '../shared/open-dashboard';

export function ConfirmView() {
  const entries = useApplicationStore((state) => state.fillPlan.entries);
  const completed = entries.filter((entry) => entry.status === 'filled').length;
  const outstanding = entries.filter((entry) => ['needs_user_input', 'changed_since_scan', 'failed'].includes(entry.status)).length;
  return <div className="step-stack"><section><p className="eyebrow">Application readiness</p><ReadinessSummary completed={completed} outstanding={outstanding} /></section><section><p className="eyebrow">Documents</p><div className="document-selection"><FileText /><div><strong>Northstar-Senior-Frontend.pdf</strong><span>Tailored resume · mock document</span></div><Button size="sm" variant="secondary" onClick={() => void openDashboard('documents')}>View</Button></div><div className="document-selection"><FileText /><div><strong>Northstar-Cover-Letter.pdf</strong><span>Cover letter · mock document</span></div><Button size="sm" variant="secondary" onClick={() => void openDashboard('documents')}>View</Button></div></section><section className="next-step"><h2>Next step</h2><p>Complete highlighted fields on the job page, review everything, then press the portal’s Submit application button.</p><strong>The extension will not submit for you.</strong></section></div>;
}
