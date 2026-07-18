import { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StepIndicator } from '../../components/application/step-indicator';
import { LoadingState } from '../../components/states/loading-state';
import { openDashboard } from '../../features/shared/open-dashboard';
import { useApplicationStore } from '../../stores/react';
import { selectCurrentStep } from '../../stores/selectors';

export default function App() {
  const hydrated = useApplicationStore((state) => state.hydrated);
  const hydrate = useApplicationStore((state) => state.hydrate);
  const job = useApplicationStore((state) => state.job);
  const step = useApplicationStore(selectCurrentStep);

  useEffect(() => { void hydrate(); }, [hydrate]);
  if (!hydrated) return <LoadingState />;

  return <main className="sidepanel-shell">
    <header className="sidepanel-header">
      <div className="header-row"><strong>Job Copilot</strong><Button variant="ghost" size="sm" onClick={() => void openDashboard('profile')}>Profile <ExternalLink size={14} /></Button></div>
      <h1>{job.title}</h1><p>{job.company} · {job.ats === 'greenhouse' ? 'Greenhouse' : 'Generic ATS'} <span className="ready">● Ready</span></p>
    </header>
    <StepIndicator current={step} />
    <section className="sidepanel-content"><div className="state-panel"><p className="eyebrow">{step}</p><h2>Phase 1 interface ready</h2><p>The {step} vertical slice is the next implementation checkpoint.</p></div></section>
    <footer className="sidepanel-footer"><Button variant="secondary">Secondary</Button><Button>Continue</Button></footer>
  </main>;
}
