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
import { backendMaxUnlocked, isScanReadOnly } from '../../features/application/backend-workflow';
import { openDashboard } from '../../features/shared/open-dashboard';
import { useActiveBackendProfile } from '../../features/profile/use-active-backend-profile';
import { SidebarProfileSelector } from '../../features/profile/sidebar-profile-selector';
import { useApplicationStore } from '../../stores/react';
import { selectCurrentStep } from '../../stores/selectors';
import type { BackendMatch, JobAnalysis } from '../../schemas/backend';

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
  const [backendJob, setBackendJob] = useState<JobAnalysis | null>(null);
  const [backendMatch, setBackendMatch] = useState<BackendMatch | null>(null);
  const profileReady = activeProfile.state.status === 'available' && activeProfile.state.scanUnlocked;
  const canonicalIndex = backendMaxUnlocked({
    profileReady,
    hasJob: Boolean(backendJob),
    hasMatch: Boolean(backendMatch),
    legacyIndex: stepOrder.indexOf(workflowStep),
  });
  const activeIndex = stepOrder.indexOf(activeStep);

  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => {
    const profileId = activeProfile.profileId;
    setBackendJob(null); setBackendMatch(null);
    if (!profileId) return;
    void browser.storage.local.get(['activeJobAnalysis', 'activeBackendMatch']).then((stored) => {
      const savedJob = stored.activeJobAnalysis as JobAnalysis | undefined;
      const savedMatch = stored.activeBackendMatch as BackendMatch | undefined;
      if (savedJob?.profile_id === profileId) setBackendJob(savedJob);
      if (savedMatch?.profile_id === profileId) setBackendMatch(savedMatch);
    });
  }, [activeProfile.profileId]);
  useEffect(() => { if (!profileReady) setActiveStep('profile'); }, [profileReady]);
  if (!hydrated) return <LoadingState />;

  const navigate = (next: StepName) => {
    setActiveStep(next);
  };
  const profile = activeProfile.state.status === 'available' ? activeProfile.state.profile : null;
  const verifiedFacts = profile?.facts.filter((fact) => fact.verified).length ?? 0;
  const displayedJob = backendJob ?? job;
  const analyzed = (analysis: JobAnalysis) => {
    setBackendJob(analysis); setBackendMatch(null);
    void browser.storage.local.set({ activeJobAnalysis: analysis }).then(() => analyze());
    setActiveStep('match');
  };
  const scored = (match: BackendMatch) => { setBackendMatch(match); void browser.storage.local.set({ activeBackendMatch: match }); };

  return <main className="sidepanel-shell">
    <header className="sidepanel-header">
      <div className="header-row"><strong>Job Copilot</strong><Button variant="ghost" size="sm" onClick={() => void openDashboard('profile')}>Open Profile <ExternalLink size={14} /></Button></div>
      {profile ? <p className="candidate-meta"><strong>{profile.display_name}</strong><span>{verifiedFacts}/{profile.facts.length} facts verified</span></p> : null}
      <h1>{displayedJob.title}</h1><p>{displayedJob.company ?? 'Company not provided'} · {'ats' in displayedJob && displayedJob.ats === 'greenhouse' ? 'Greenhouse' : 'Analyzed job'} {profileReady ? <span className="ready">● Profile ready</span> : null}</p>
    </header>
    <StepIndicator current={activeStep} maxUnlocked={canonicalIndex} onNavigate={navigate} />
    <section className="sidepanel-content">
      {recoveryNotice && <div className="recovery-notice" role="status"><span>{recoveryNotice}</span><button onClick={dismissRecovery}>Dismiss</button></div>}
      {activeStep === 'profile' ? <ProfileStage active={activeProfile} /> : status === 'failed' ? <ErrorState title="Analysis interrupted" message={error ?? 'The operation failed.'} onRetry={() => void retry()} /> : activeStep === 'scan' ? <ScanView profileId={activeProfile.profileId!} savedJob={backendJob} readOnly={isScanReadOnly(backendJob)} onAnalyzed={analyzed} /> : activeStep === 'match' && backendJob ? <MatchView profileId={activeProfile.profileId!} job={backendJob} savedMatch={backendMatch} onScored={scored} /> : activeStep === 'match' ? <ErrorState title="Analyze a job first" message="Return to Scan and submit a job description." /> : activeStep === 'tailor' ? <TailorView readOnly={activeIndex < canonicalIndex} /> : activeStep === 'fill' ? <FillView readOnly={activeIndex < canonicalIndex} /> : <ConfirmView />}
    </section>
    <footer className="sidepanel-footer">
      {activeStep === 'profile' ? <><Button variant="secondary" onClick={() => void openDashboard('profile')}>Open Profile</Button><Button disabled={!profileReady} onClick={() => setActiveStep('scan')}>Continue to Scan</Button></> : activeIndex < canonicalIndex ? <><Button variant="secondary" onClick={() => setActiveStep(stepOrder[Math.max(0, activeIndex - 1)])}>Previous</Button><Button onClick={() => setActiveStep(stepOrder[activeIndex + 1])}>Continue</Button></> : activeStep === 'scan' ? <><Button variant="secondary" onClick={() => setActiveStep('profile')}>Profile</Button><span className="footer-hint">Analyze from the form above</span></> : activeStep === 'match' ? <><Button variant="secondary" onClick={() => setActiveStep('scan')}>Review scan</Button><Button disabled={!backendMatch} onClick={() => void transitionTo('tailoring')}>Continue</Button></> : activeStep === 'tailor' ? <><Button variant="secondary" onClick={() => void openDashboard('documents')}>Review details</Button><Button onClick={() => { void transitionTo('reviewing').then(() => transitionTo('ready_to_fill')); }}>Approve set</Button></> : activeStep === 'fill' ? <><Button variant="secondary">Rescan fields</Button><Button disabled={!fillPlan.entries.some((entry) => entry.selected)} onClick={() => void simulateFill()}>Fill {fillPlan.entries.filter((entry) => entry.selected).length} approved</Button></> : <><Button variant="secondary" onClick={() => setActiveStep('fill')}>Back to fields</Button><Button onClick={() => void markReady()}>Mark as ready</Button></>}
    </footer>
  </main>;
}

function ProfileStage({ active }: { active: ReturnType<typeof useActiveBackendProfile> }) {
  const profile = active.state.status === 'available' ? active.state.profile : null;
  const guidance = !profile
    ? 'Select a profile to continue.'
    : active.state.scanUnlocked
      ? `${profile.display_name} is ready. Continue to Scan when you are ready.`
      : profile.facts.some((fact) => !fact.verified)
        ? 'This profile needs fact verification before Scan can be unlocked.'
        : 'Complete the source comparison before Scan can be unlocked.';
  return <div className="step-stack profile-selection-stage">
    <div><p className="eyebrow">Candidate profile</p><h2>Select the profile for this job</h2><p>{guidance}</p></div>
    <SidebarProfileSelector activeProfileId={active.profileId} />
    {active.state.status === 'error' ? <p className="form-error" role="alert">{active.state.message}</p> : null}
  </div>;
}
