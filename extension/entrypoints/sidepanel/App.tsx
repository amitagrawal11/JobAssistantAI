import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StepIndicator, type StepName } from '../../components/application/step-indicator';
import { LoadingState } from '../../components/states/loading-state';
import { ErrorState } from '../../components/states/error-state';
import { ScanView } from '../../features/job-analysis/scan-view';
import { MatchView } from '../../features/job-analysis/match-view';
import { TailorView } from '../../features/tailoring/tailor-view';
import { FillView } from '../../features/application-fill/fill-view';
import { ConfirmView } from '../../features/application-fill/confirm-view';
import { ProfileRequired } from '../../components/application/profile-required';
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
  const fillPlan = useApplicationStore((state) => state.fillPlan);
  const simulateFill = useApplicationStore((state) => state.simulateFill);
  const markReady = useApplicationStore((state) => state.markApplicationReady);
  const profileReady = useApplicationStore((state) => state.profile.verification.status === 'ready');
  const recoveryNotice = useApplicationStore((state) => state.recoveryNotice);
  const dismissRecovery = useApplicationStore((state) => state.dismissRecoveryNotice);
  const [activeStep, setActiveStep] = useState<StepName>(step);
  const stepOrder: StepName[] = ['scan', 'match', 'tailor', 'fill', 'confirm'];
  const canonicalIndex = stepOrder.indexOf(step);
  const activeIndex = stepOrder.indexOf(activeStep);

  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => { setActiveStep(step); }, [status, step]);
  if (!hydrated) return <LoadingState />;
  if (!profileReady) return <main className="sidepanel-shell profile-gate"><header className="sidepanel-header"><strong>Job Copilot</strong></header><ProfileRequired onSetup={() => void openDashboard('profile')} /></main>;

  return <main className="sidepanel-shell">
    <header className="sidepanel-header">
      <div className="header-row"><strong>Job Copilot</strong><Button variant="ghost" size="sm" onClick={() => void openDashboard('profile')}>Profile <ExternalLink size={14} /></Button></div>
      <h1>{job.title}</h1><p>{job.company} · {job.ats === 'greenhouse' ? 'Greenhouse' : 'Generic ATS'} <span className="ready">● Ready</span></p>
    </header>
    <StepIndicator current={activeStep} maxUnlocked={canonicalIndex} onNavigate={setActiveStep} />
    <section className="sidepanel-content">
      {recoveryNotice && <div className="recovery-notice" role="status"><span>{recoveryNotice}</span><button onClick={dismissRecovery}>Dismiss</button></div>}
      {status === 'failed' ? <ErrorState title="Analysis interrupted" message={error ?? 'The mock operation failed.'} onRetry={() => void retry()} /> : activeStep === 'scan' ? <ScanView readOnly={activeIndex < canonicalIndex} /> : activeStep === 'match' ? <MatchView /> : activeStep === 'tailor' ? <TailorView readOnly={activeIndex < canonicalIndex} /> : activeStep === 'fill' ? <FillView readOnly={activeIndex < canonicalIndex} /> : <ConfirmView />}
    </section>
    <footer className="sidepanel-footer">
      {activeIndex < canonicalIndex ? <><Button variant="secondary" onClick={() => setActiveStep(stepOrder[Math.max(0, activeIndex - 1)])} disabled={activeIndex === 0}>Previous</Button><Button onClick={() => setActiveStep(stepOrder[activeIndex + 1])}>Continue</Button></> : activeStep === 'scan' ? <><Button variant="secondary" onClick={() => void analyze({ fail: true })}>Simulate error</Button><Button onClick={() => void analyze()}>Analyze job</Button></> : activeStep === 'match' ? <><Button variant="secondary" onClick={() => setActiveStep('scan')}>Review scan</Button><Button onClick={() => void transitionTo('tailoring')}>Continue</Button></> : activeStep === 'tailor' ? <><Button variant="secondary" onClick={() => void openDashboard('documents')}>Review details</Button><Button onClick={() => { void transitionTo('reviewing').then(() => transitionTo('ready_to_fill')); }}>Approve set</Button></> : activeStep === 'fill' ? <><Button variant="secondary">Rescan fields</Button><Button disabled={!fillPlan.entries.some((entry) => entry.selected)} onClick={() => void simulateFill()}>Fill {fillPlan.entries.filter((entry) => entry.selected).length} approved</Button></> : <><Button variant="secondary" onClick={() => setActiveStep('fill')}>Back to fields</Button><Button onClick={() => void markReady()}>Mark as ready</Button></>}
    </footer>
  </main>;
}
