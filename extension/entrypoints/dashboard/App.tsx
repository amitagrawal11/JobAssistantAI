import { useState } from 'react';
import { FileText, LayoutDashboard, Settings, UserRound } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { DashboardSection } from '../../stores/state';
import { DocumentsPage } from '../../features/dashboard/documents-page';
import { ProfilePage } from '../../features/dashboard/profile-page';
import { ApplicationsPage } from '../../features/dashboard/applications-page';
import { SettingsPage } from '../../features/dashboard/settings-page';
import { useActiveBackendProfile } from '../../features/profile/use-active-backend-profile';

const navigation = [
  ['profile', 'Profile', UserRound], ['documents', 'Documents', FileText],
  ['applications', 'Applications', LayoutDashboard], ['settings', 'Settings', Settings],
] as const;

function initialSection(): DashboardSection {
  const hash = window.location.hash.slice(1) as DashboardSection;
  return navigation.some(([id]) => id === hash) ? hash : 'profile';
}

export default function App() {
  const [section, setSection] = useState<DashboardSection>(initialSection);
  const activeProfile = useActiveBackendProfile();
  const content = section === 'profile' ? <ProfilePage /> : section === 'documents' ? <DocumentsPage /> : section === 'applications' ? <ApplicationsPage /> : <SettingsPage />;

  return <main className="dashboard-shell">
    <header className="dashboard-header"><strong>Job Copilot Dashboard</strong><DashboardProfileStatus active={activeProfile} /></header>
    <nav className="dashboard-nav" aria-label="Dashboard navigation">
      {navigation.map(([id, label, Icon]) => <Button key={id} variant={section === id ? 'secondary' : 'ghost'} onClick={() => { setSection(id); window.location.hash = id; }}><Icon size={18} />{label}</Button>)}
    </nav>
    <section className="dashboard-content">{content}</section>
    <footer className="dashboard-footer">Local backend data <span>Help · About</span></footer>
  </main>;
}

function DashboardProfileStatus({ active }: { active: ReturnType<typeof useActiveBackendProfile> }) {
  if (active.state.status === 'loading') return <span className="profile-status">Loading profile…</span>;
  if (active.state.status === 'missing') return <span className="profile-status">No profile selected</span>;
  if (active.state.status === 'error') return <span className="profile-status error">Backend unavailable <button onClick={() => void active.refetch()}>Retry</button></span>;
  const name = active.state.profile.facts.find((fact) => fact.key === 'full_name')?.value ?? active.state.profile.display_name;
  return <span className={active.state.scanUnlocked ? 'ready' : 'profile-status warning'}>{name} · {active.state.scanUnlocked ? 'Ready ●' : 'Needs review'}</span>;
}
