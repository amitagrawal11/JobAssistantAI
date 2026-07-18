import { useEffect } from 'react';
import { FileText, LayoutDashboard, Settings, UserRound } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { LoadingState } from '../../components/states/loading-state';
import { useApplicationStore } from '../../stores/react';
import type { DashboardSection } from '../../stores/state';
import { DocumentsPage } from '../../features/dashboard/documents-page';

const navigation = [
  ['profile', 'Profile', UserRound], ['documents', 'Documents', FileText],
  ['applications', 'Applications', LayoutDashboard], ['settings', 'Settings', Settings],
] as const;

export default function App() {
  const hydrated = useApplicationStore((state) => state.hydrated);
  const hydrate = useApplicationStore((state) => state.hydrate);
  const section = useApplicationStore((state) => state.dashboardSection);
  const setSection = useApplicationStore((state) => state.setDashboardSection);
  const profile = useApplicationStore((state) => state.profile);

  useEffect(() => {
    const hash = window.location.hash.slice(1) as DashboardSection;
    if (navigation.some(([id]) => id === hash)) setSection(hash);
    void hydrate();
  }, [hydrate, setSection]);
  if (!hydrated) return <LoadingState />;

  return <main className="dashboard-shell">
    <header className="dashboard-header"><strong>Job Copilot Dashboard</strong><span className="ready">Profile ready ●</span></header>
    <nav className="dashboard-nav" aria-label="Dashboard navigation">
      {navigation.map(([id, label, Icon]) => <Button key={id} variant={section === id ? 'secondary' : 'ghost'} onClick={() => { setSection(id); window.location.hash = id; }}><Icon size={18} />{label}</Button>)}
    </nav>
    <section className="dashboard-content">{section === 'documents' ? <DocumentsPage /> : <><p className="eyebrow">{section}</p><h1>{section[0].toUpperCase() + section.slice(1)}</h1><p>{profile.personal.fullName} · Phase 1 content module ready for implementation.</p><div className="dashboard-placeholder">Dashboard content area</div></>}</section>
    <footer className="dashboard-footer">Local mock data · Refresh-safe checkpoints <span>Help · About</span></footer>
  </main>;
}
