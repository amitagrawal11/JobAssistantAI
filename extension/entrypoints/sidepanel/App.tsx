import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StepIndicator, type StepName } from '../../components/application/step-indicator';
import { ErrorState } from '../../components/states/error-state';
import { ScanView } from '../../features/job-analysis/scan-view';
import { MatchView } from '../../features/job-analysis/match-view';
import { backendMaxUnlocked, isScanReadOnly } from '../../features/application/backend-workflow';
import { openDashboard } from '../../features/shared/open-dashboard';
import { useActiveBackendProfile } from '../../features/profile/use-active-backend-profile';
import { SidebarProfileSelector } from '../../features/profile/sidebar-profile-selector';
import type { BackendMatch, JobAnalysis } from '../../schemas/backend';

const stepOrder: StepName[] = ['profile', 'scan', 'match', 'tailor', 'fill', 'confirm'];
const RUNTIME_DATA_VERSION = 2;

export default function App() {
  const activeProfile = useActiveBackendProfile();
  const [activeStep, setActiveStep] = useState<StepName>('profile');
  const [backendJob, setBackendJob] = useState<JobAnalysis | null>(null);
  const [backendMatch, setBackendMatch] = useState<BackendMatch | null>(null);
  const profileReady = activeProfile.state.status === 'available' && activeProfile.state.scanUnlocked;
  const maxUnlocked = backendMaxUnlocked({
    profileReady,
    hasJob: Boolean(backendJob),
    hasMatch: Boolean(backendMatch),
    legacyIndex: 3,
  });
  const activeIndex = stepOrder.indexOf(activeStep);

  useEffect(() => {
    const profileId = activeProfile.profileId;
    setBackendJob(null);
    setBackendMatch(null);
    if (!profileId) return;
    void browser.storage.local.get([
      'runtimeDataVersion',
      'activeJobAnalysis',
      'activeBackendMatch',
    ]).then(async (stored) => {
      if (stored.runtimeDataVersion !== RUNTIME_DATA_VERSION) {
        await browser.storage.local.remove([
          'job-copilot.phase-1.session',
          'activeJobAnalysis',
          'activeBackendMatch',
        ]);
        await browser.storage.local.set({ runtimeDataVersion: RUNTIME_DATA_VERSION });
        return;
      }
      const savedJob = stored.activeJobAnalysis as JobAnalysis | undefined;
      const savedMatch = stored.activeBackendMatch as BackendMatch | undefined;
      if (savedJob?.profile_id === profileId) setBackendJob(savedJob);
      if (savedMatch?.profile_id === profileId && savedMatch.job_id === savedJob?.job_id) setBackendMatch(savedMatch);
    });
  }, [activeProfile.profileId]);
  useEffect(() => { if (!profileReady) setActiveStep('profile'); }, [profileReady]);

  const profile = activeProfile.state.status === 'available' ? activeProfile.state.profile : null;
  const verifiedFacts = profile?.facts.filter((fact) => fact.verified).length ?? 0;
  const candidateName = profile?.facts.find((fact) => fact.key === 'full_name')?.value ?? profile?.display_name;
  const analyzed = (analysis: JobAnalysis) => {
    setBackendJob(analysis);
    setBackendMatch(null);
    void browser.storage.local.set({ activeJobAnalysis: analysis }).then(() => browser.storage.local.remove('activeBackendMatch'));
    setActiveStep('match');
  };
  const scored = (match: BackendMatch) => {
    setBackendMatch(match);
    void browser.storage.local.set({ activeBackendMatch: match });
  };

  return <main className="sidepanel-shell">
    <header className="sidepanel-header">
      <div className="header-row"><strong>Job Copilot</strong><Button variant="ghost" size="sm" onClick={() => void openDashboard('profile')}>Open Profile <ExternalLink size={14} /></Button></div>
      {profile ? <p className="candidate-meta"><strong>{candidateName}</strong><span>{verifiedFacts}/{profile.facts.length} facts verified</span></p> : null}
      <h1>{backendJob?.title ?? 'No job selected'}</h1>
      <p>{backendJob ? `${backendJob.company ?? 'Company not provided'} · Analyzed job` : 'Select a profile, then analyze a job'} {profileReady ? <span className="ready">● Profile ready</span> : null}</p>
    </header>
    <StepIndicator current={activeStep} maxUnlocked={maxUnlocked} onNavigate={setActiveStep} />
    <section className="sidepanel-content">
      {activeStep === 'profile' ? <ProfileStage active={activeProfile} />
        : activeStep === 'scan' ? <ScanView profileId={activeProfile.profileId!} savedJob={backendJob} readOnly={isScanReadOnly(backendJob)} onAnalyzed={analyzed} />
          : activeStep === 'match' && backendJob ? <MatchView profileId={activeProfile.profileId!} job={backendJob} savedMatch={backendMatch} onScored={scored} />
            : activeStep === 'match' ? <ErrorState title="Analyze a job first" message="Return to Scan and submit a job description." />
              : <UnavailableStage />}
    </section>
    <footer className="sidepanel-footer">
      {activeStep === 'profile' ? <><Button variant="secondary" onClick={() => void openDashboard('profile')}>Open Profile</Button><Button disabled={!profileReady} onClick={() => setActiveStep('scan')}>Continue to Scan</Button></>
        : activeStep === 'scan' ? <><Button variant="secondary" onClick={() => setActiveStep('profile')}>Profile</Button>{backendJob ? <Button onClick={() => setActiveStep('match')}>Continue to Match</Button> : <span className="footer-hint">Analyze from the form above</span>}</>
          : activeStep === 'match' ? <><Button variant="secondary" onClick={() => setActiveStep('scan')}>Review scan</Button><Button disabled={!backendMatch} onClick={() => setActiveStep('tailor')}>Continue</Button></>
            : <><Button variant="secondary" onClick={() => setActiveStep(stepOrder[Math.max(0, activeIndex - 1)])}>Previous</Button><span className="footer-hint">Backend implementation required</span></>}
    </footer>
  </main>;
}

function ProfileStage({ active }: { active: ReturnType<typeof useActiveBackendProfile> }) {
  const profile = active.state.status === 'available' ? active.state.profile : null;
  const displayName = profile?.facts.find((fact) => fact.key === 'full_name')?.value ?? profile?.display_name;
  const guidance = !profile
    ? 'Select a profile to continue.'
    : active.state.scanUnlocked
      ? `${displayName} is ready. Continue to Scan when you are ready.`
      : profile.facts.some((fact) => !fact.verified)
        ? 'This profile needs fact verification before Scan can be unlocked.'
        : 'Complete the source comparison before Scan can be unlocked.';
  return <div className="step-stack profile-selection-stage">
    <div><p className="eyebrow">Candidate profile</p><h2>Select the profile for this job</h2><p>{guidance}</p></div>
    <SidebarProfileSelector activeProfileId={active.profileId} />
    {active.state.status === 'error' ? <p className="form-error" role="alert">{active.state.message}</p> : null}
  </div>;
}

function UnavailableStage() {
  return <div className="profile-required"><h1>Not available yet</h1><p>Tailoring, application filling, and confirmation will unlock when their backend phases are implemented. No fictional data is shown.</p></div>;
}
