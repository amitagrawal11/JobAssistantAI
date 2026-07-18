import { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StepIndicator } from '../../components/application/step-indicator';
import { LoadingState } from '../../components/states/loading-state';
import { ErrorState } from '../../components/states/error-state';
import { ScanView } from '../../features/job-analysis/scan-view';
import { MatchView } from '../../features/job-analysis/match-view';
import { TailorView } from '../../features/tailoring/tailor-view';
import { openDashboard } from '../../features/shared/open-dashboard';
import { useApplicationStore } from '../../stores/react';
import { selectCurrentStep } from '../../stores/selectors';

export default function App() {
  const hydrated = useApplicationStore((state) => state.hydrated);
  const hydrate = useApplicationStore((state) => state.hydrate);
  const job = useApplicationStore((state) => state.job);
  const step = useApplicationStore(selectCurrentStep);
  const status = useApplicationStore((state) => state.workflowStatus);
  const error = useApplicationStore((state) => state.transientError);
  const analyze = useApplicationStore((state) => state.analyzeMockJob);
  const retry = useApplicationStore((state) => state.retryLastOperation);
  const transitionTo = useApplicationStore((state) => state.transitionTo);

  useEffect(() => { void hydrate(); }, [hydrate]);
  if (!hydrated) return <LoadingState />;

  return <main className="sidepanel-shell">
    <header className="sidepanel-header">
      <div className="header-row"><strong>Job Copilot</strong><Button variant="ghost" size="sm" onClick={() => void openDashboard('profile')}>Profile <ExternalLink size={14} /></Button></div>
      <h1>{job.title}</h1><p>{job.company} · {job.ats === 'greenhouse' ? 'Greenhouse' : 'Generic ATS'} <span className="ready">● Ready</span></p>
    </header>
    <StepIndicator current={step} />
    <section className="sidepanel-content">
      {status === 'failed' ? <ErrorState title="Analysis interrupted" message={error ?? 'The mock operation failed.'} onRetry={() => void retry()} /> : step === 'scan' ? <ScanView /> : step === 'match' ? <MatchView /> : step === 'tailor' ? <TailorView /> : <div className="state-panel"><p className="eyebrow">{step}</p><h2>{step[0].toUpperCase() + step.slice(1)} is next</h2><p>This vertical slice follows the approved Tailor checkpoint.</p></div>}
    </section>
    <footer className="sidepanel-footer">
      {step === 'scan' ? <><Button variant="secondary" onClick={() => void analyze({ fail: true })}>Simulate error</Button><Button onClick={() => void analyze()}>Analyze job</Button></> : step === 'match' ? <><Button variant="secondary" onClick={() => void transitionTo('job_detected')}>Edit job</Button><Button onClick={() => void transitionTo('tailoring')}>Continue</Button></> : step === 'tailor' ? <><Button variant="secondary" onClick={() => void openDashboard('documents')}>Review details</Button><Button onClick={() => { void transitionTo('reviewing').then(() => transitionTo('ready_to_fill')); }}>Approve set</Button></> : <><Button variant="secondary">Back</Button><Button disabled>Continue</Button></>}
    </footer>
  </main>;
}
