import { useEffect, useState } from 'react';
import { FileText, LayoutDashboard, Settings, UserRound } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { LoadingState } from '../../components/states/loading-state';
import { useApplicationStore } from '../../stores/react';
import type { DashboardSection } from '../../stores/state';
import { DocumentsPage } from '../../features/dashboard/documents-page';
import { ProfilePage } from '../../features/dashboard/profile-page';
import { ApplicationsPage } from '../../features/dashboard/applications-page';
import { SettingsPage } from '../../features/dashboard/settings-page';

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
  const recoveryNotice = useApplicationStore((state) => state.recoveryNotice);
  const dismissRecovery = useApplicationStore((state) => state.dismissRecoveryNotice);
  const [routeRecovered, setRouteRecovered] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1) as DashboardSection;
    if (navigation.some(([id]) => id === hash)) setSection(hash);
    else if (hash) { setSection('profile'); window.location.hash = 'profile'; setRouteRecovered(true); }
    void hydrate();
  }, [hydrate, setSection]);
  if (!hydrated) return <LoadingState />;

  const content = section === 'profile' ? <ProfilePage /> : section === 'documents' ? <DocumentsPage /> : section === 'applications' ? <ApplicationsPage /> : <SettingsPage />;

  return <main className="dashboard-shell">
    <header className="dashboard-header"><strong>Job Copilot Dashboard</strong><span className="ready">Profile ready ●</span></header>
    <nav className="dashboard-nav" aria-label="Dashboard navigation">
      {navigation.map(([id, label, Icon]) => <Button key={id} variant={section === id ? 'secondary' : 'ghost'} onClick={() => { setSection(id); window.location.hash = id; }}><Icon size={18} />{label}</Button>)}
    </nav>
    <section className="dashboard-content">{(recoveryNotice || routeRecovered) && <div className="recovery-notice" role="status"><span>{recoveryNotice ?? 'Unknown Dashboard section; returned to Profile.'}</span><button onClick={() => { dismissRecovery(); setRouteRecovered(false); }}>Dismiss</button></div>}{content}</section>
    <footer className="dashboard-footer">Local mock data · Refresh-safe checkpoints <span>Help · About</span></footer>
  </main>;
}
