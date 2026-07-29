import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, LoaderCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StepIndicator, type StepName } from '../../components/application/step-indicator';
import { ErrorState } from '../../components/states/error-state';
import { ScanView } from '../job-analysis/scan-view';
import { MatchView } from '../job-analysis/match-view';
import { TailorView } from '../tailoring/tailor-view';
import { analyzeJob, scoreMatch } from '../../api/jobs';
import { tailorDocuments } from '../../api/tailoring';
import { backendMaxUnlocked, isScanReadOnly } from './backend-workflow';
import { useActiveBackendProfile } from '../profile/use-active-backend-profile';
import { SidebarProfileSelector } from '../profile/sidebar-profile-selector';
import type { BackendMatch, JobAnalysis } from '../../schemas/backend';
import type { DocumentTailorResponse } from '../../schemas/tailoring';
import { browser } from '../../lib/browser-storage';

const stepOrder: StepName[] = ['profile', 'scan', 'match', 'tailor', 'fill', 'confirm'];
const RUNTIME_DATA_VERSION = 2;

export function StartApplicationFlow() {
  const activeProfile = useActiveBackendProfile();
  const [activeStep, setActiveStep] = useState<StepName>('profile');
  const [backendJob, setBackendJob] = useState<JobAnalysis | null>(null);
  const [backendMatch, setBackendMatch] = useState<BackendMatch | null>(null);
  const [tailored, setTailored] = useState<DocumentTailorResponse | null>(null);
  const lastDescription = useRef('');
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
    setTailored(null);
    if (!profileId) return;
    void browser.storage.local.get(['runtimeDataVersion']).then(async (stored) => {
      if (stored.runtimeDataVersion !== RUNTIME_DATA_VERSION) {
        await browser.storage.local.remove([
          'job-copilot.phase-1.session',
          'activeJobAnalysis',
          'activeBackendMatch',
        ]);
        await browser.storage.local.set({ runtimeDataVersion: RUNTIME_DATA_VERSION });
      }
    });
  }, [activeProfile.profileId]);
  useEffect(() => { if (!profileReady) setActiveStep('profile'); }, [profileReady]);

  const runMatch = useMutation({
    mutationFn: async (description: string) => {
      const pid = activeProfile.profileId!;
      const job = await analyzeJob({ profile_id: pid, description });
      const match = await scoreMatch(pid, job);
      return { job, match };
    },
    onSuccess: ({ job, match }) => {
      setBackendJob(job);
      setBackendMatch(match);
    },
  });
  const startAnalyze = (description: string) => {
    lastDescription.current = description;
    setActiveStep('match');
    runMatch.mutate(description);
  };

  const runTailor = useMutation({
    mutationFn: () => tailorDocuments(activeProfile.profileId!, backendJob!.job_id),
    onSuccess: setTailored,
  });
  const continueToTailor = () => {
    setActiveStep('tailor');
    if (!tailored) runTailor.mutate();
  };
  const updateChangeStatus = (changeId: string, status: 'approved' | 'rejected') => {
    setTailored((current) => current && {
      ...current,
      resume: {
        ...current.resume,
        changes: current.resume.changes.map((change) => change.id === changeId ? { ...change, status } : change),
      },
    });
  };

  return <div className="flex h-full min-h-0 flex-col gap-6">

    <StepIndicator current={activeStep} maxUnlocked={maxUnlocked} onNavigate={setActiveStep} />


    <div className="flex min-h-0 flex-1 flex-col">
      {activeStep === 'profile' ? <ProfileStage active={activeProfile} />
        : activeStep === 'scan' ? <ScanView savedJob={backendJob} readOnly={isScanReadOnly(backendJob)} onAnalyze={startAnalyze} />
          : activeStep === 'match' ? (
            runMatch.isPending ? <div className="step-stack"><div><p className="eyebrow">Job Copilot</p><h2>Analyzing your job</h2><p>Extracting the requirements and scoring your match against this job.</p></div><p className="provider-status"><span className="button-busy"><LoaderCircle className="spin" size={16} /> Analyzing job and scoring…</span></p></div>
              : runMatch.isError ? <div className="step-stack"><div><p className="eyebrow">Job Copilot</p><h2>Match failed</h2></div><p className="form-error" role="alert">{runMatch.error.message}</p><Button onClick={() => runMatch.mutate(lastDescription.current)} disabled={!lastDescription.current}><RefreshCw size={14} /> Retry</Button></div>
                : backendMatch ? <MatchView match={backendMatch} />
                  : <ErrorState title="Analyze a job first" message="Return to Scan and submit a job description." />
          )
            : activeStep === 'tailor' ? (
              runTailor.isPending ? <div className="step-stack"><div><p className="eyebrow">Job Copilot</p><h2>Tailoring your documents</h2><p>Rewriting your resume and drafting a cover letter grounded in your verified facts.</p></div><p className="provider-status"><span className="button-busy"><LoaderCircle className="spin" size={16} /> Tailoring resume and cover letter…</span></p></div>
                : runTailor.isError ? <div className="step-stack"><div><p className="eyebrow">Job Copilot</p><h2>Tailoring failed</h2></div><p className="form-error" role="alert">{runTailor.error.message}</p><Button onClick={() => runTailor.mutate()}><RefreshCw size={14} /> Retry</Button></div>
                  : tailored ? <TailorView tailored={tailored} onChangeReviewed={updateChangeStatus} />
                    : <ErrorState title="Score a match first" message="Return to Match before tailoring documents." />
            )
              : <UnavailableStage />}
    </div>


    <div className="flex items-center justify-between gap-3">
      {activeStep === 'profile' ? <Button className="ml-auto" disabled={!profileReady} onClick={() => setActiveStep('scan')}>Continue to Scan <ArrowRight size={14} /></Button>
        : activeStep === 'scan' ? <><Button variant="secondary" onClick={() => setActiveStep('profile')}><ArrowLeft size={14} /> Profile</Button><Button type="submit" form="job-analysis-form">Continue to Match <ArrowRight size={14} /></Button></>
          : activeStep === 'match' ? <><Button variant="secondary" onClick={() => setActiveStep('scan')}><ArrowLeft size={14} /> Review scan</Button><Button disabled={!backendMatch} onClick={continueToTailor}>Continue to Tailor <ArrowRight size={14} /></Button></>
            : activeStep === 'tailor' ? <><Button variant="secondary" onClick={() => setActiveStep('match')}><ArrowLeft size={14} /> Review match</Button><span className="text-xs text-muted-foreground">Filling and confirmation are not available yet</span></>
              : <><Button variant="secondary" onClick={() => setActiveStep(stepOrder[Math.max(0, activeIndex - 1)])}><ArrowLeft size={14} /> Previous</Button><span className="text-xs text-muted-foreground">Backend implementation required</span></>}
    </div>
  </div>;
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
  return <div className="space-y-4">
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Candidate profile</p>
      <h2 className="text-lg font-semibold tracking-tight">Select the profile for this job</h2>
      <p className="text-sm text-muted-foreground">{guidance}</p>
    </div>
    <SidebarProfileSelector activeProfileId={active.profileId} />
    {active.state.status === 'error' ? <p className="text-sm text-destructive" role="alert">{active.state.message}</p> : null}
  </div>;
}

function UnavailableStage() {
  return <div className="profile-required"><h1>Not available yet</h1><p>Tailoring, application filling, and confirmation will unlock when their backend phases are implemented. No fictional data is shown.</p></div>;
}
