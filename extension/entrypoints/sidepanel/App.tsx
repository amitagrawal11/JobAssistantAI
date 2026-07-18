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
import { useActiveBackendProfile } from '../../features/profile/use-active-backend-profile';
import { useApplicationStore } from '../../stores/react';
import { selectCurrentStep } from '../../stores/selectors';

const stepOrder: StepName[] = ['profile', 'scan', 'match', 'tailor', 'fill', 'confirm'];

export default function App() {
  const hydrated = useApplicationStore((state) => state.hydrated);
  const hydrate = useApplicationStore((state) => state.hydrate);
  const job = useApplicationStore((state) => state.job);
  const workflowStep = useApplicationStore(selectCurrentStep);
  const status = useApplicationStore((state) => state.workflowStatus);
  const error = useApplicationStore((state) => state.transientError);
  const analyze = useApplicationStore((state) => state.analyzeMockJob);
  const retry = useApplicationStore((state) => state.retryLastOperation);
  const transitionTo = useApplicationStore((state) => state.transitionTo);
  const fillPlan = useApplicationStore((state) => state.fillPlan);
  const simulateFill = useApplicationStore((state) => state.simulateFill);
  const markReady = useApplicationStore((state) => state.markApplicationReady);
  const recoveryNotice = useApplicationStore((state) => state.recoveryNotice);
  const dismissRecovery = useApplicationStore((state) => state.dismissRecoveryNotice);
  const activeProfile = useActiveBackendProfile();
  const [activeStep, setActiveStep] = useState<StepName>('profile');
  const profileReady = activeProfile.state.status === 'available' && activeProfile.state.scanUnlocked;
  const canonicalIndex = profileReady ? stepOrder.indexOf(workflowStep) : 0;
  const activeIndex = stepOrder.indexOf(activeStep);

  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => { setActiveStep(profileReady ? workflowStep : 'profile'); }, [profileReady, status, workflowStep]);
  if (!hydrated) return <LoadingState />;

  const navigate = (next: StepName) => {
    if (next === 'profile') {
      setActiveStep('profile');
      void openDashboard('profile');
      return;
    }
    setActiveStep(next);
  };
  const profile = activeProfile.state.status === 'available' ? activeProfile.state.profile : null;
  const verifiedFacts = profile?.facts.filter((fact) => fact.verified).length ?? 0;

  return <main className="sidepanel-shell">
    <header className="sidepanel-header">
      <div className="header-row"><strong>Job Copilot</strong><Button variant="ghost" size="sm" onClick={() => void openDashboard('profile')}>Profile <ExternalLink size={14} /></Button></div>
      {profile ? <p className="candidate-meta"><strong>{profile.display_name}</strong><span>{verifiedFacts}/{profile.facts.length} facts verified</span></p> : null}
      <h1>{job.title}</h1><p>{job.company} · {job.ats === 'greenhouse' ? 'Greenhouse' : 'Generic ATS'} {profileReady ? <span className="ready">● Profile ready</span> : null}</p>
    </header>
    <StepIndicator current={activeStep} maxUnlocked={canonicalIndex} onNavigate={navigate} />
    <section className="sidepanel-content">
      {recoveryNotice && <div className="recovery-notice" role="status"><span>{recoveryNotice}</span><button onClick={dismissRecovery}>Dismiss</button></div>}
      {activeStep === 'profile' ? <ProfileStage active={activeProfile} /> : status === 'failed' ? <ErrorState title="Analysis interrupted" message={error ?? 'The mock operation failed.'} onRetry={() => void retry()} /> : activeStep === 'scan' ? <ScanView readOnly={activeIndex < canonicalIndex} /> : activeStep === 'match' ? <MatchView /> : activeStep === 'tailor' ? <TailorView readOnly={activeIndex < canonicalIndex} /> : activeStep === 'fill' ? <FillView readOnly={activeIndex < canonicalIndex} /> : <ConfirmView />}
    </section>
    <footer className="sidepanel-footer">
      {activeStep === 'profile' ? <><Button variant="secondary" onClick={() => void openDashboard('profile')}>Open Profile</Button><Button disabled={!profileReady} onClick={() => setActiveStep('scan')}>Continue to Scan</Button></> : activeIndex < canonicalIndex ? <><Button variant="secondary" onClick={() => setActiveStep(stepOrder[Math.max(0, activeIndex - 1)])}>Previous</Button><Button onClick={() => setActiveStep(stepOrder[activeIndex + 1])}>Continue</Button></> : activeStep === 'scan' ? <><Button variant="secondary" onClick={() => void analyze({ fail: true })}>Simulate error</Button><Button onClick={() => void analyze()}>Analyze job</Button></> : activeStep === 'match' ? <><Button variant="secondary" onClick={() => setActiveStep('scan')}>Review scan</Button><Button onClick={() => void transitionTo('tailoring')}>Continue</Button></> : activeStep === 'tailor' ? <><Button variant="secondary" onClick={() => void openDashboard('documents')}>Review details</Button><Button onClick={() => { void transitionTo('reviewing').then(() => transitionTo('ready_to_fill')); }}>Approve set</Button></> : activeStep === 'fill' ? <><Button variant="secondary">Rescan fields</Button><Button disabled={!fillPlan.entries.some((entry) => entry.selected)} onClick={() => void simulateFill()}>Fill {fillPlan.entries.filter((entry) => entry.selected).length} approved</Button></> : <><Button variant="secondary" onClick={() => setActiveStep('fill')}>Back to fields</Button><Button onClick={() => void markReady()}>Mark as ready</Button></>}
    </footer>
  </main>;
}

function ProfileStage({ active }: { active: ReturnType<typeof useActiveBackendProfile> }) {
  if (active.state.status === 'loading') return <ProfileRequired title="Checking profile" message="Loading your active backend profile before unlocking the job workflow." onSetup={() => void openDashboard('profile')} />;
  if (active.state.status === 'missing') return <ProfileRequired message="Upload a resume, verify its extracted facts, and complete the source comparison to unlock Scan." onSetup={() => void openDashboard('profile')} />;
  if (active.state.status === 'error') return <ProfileRequired title="Profile unavailable" message={active.state.message} onSetup={() => void openDashboard('profile')} onRetry={() => void active.refetch()} />;
  const profile = active.state.profile;
  if (!active.state.scanUnlocked) {
    const message = profile.facts.some((fact) => !fact.verified)
      ? 'Verify every extracted fact in the Dashboard before analyzing a job.'
      : 'Mark the source comparison complete in the Dashboard to unlock Scan.';
    return <ProfileRequired title="Complete your profile" message={message} onSetup={() => void openDashboard('profile')} />;
  }
  return <ProfileRequired title="Profile complete" message={`${profile.display_name} is ready. You can continue to Scan.`} onSetup={() => void openDashboard('profile')} />;
}
