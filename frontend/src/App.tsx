import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, FileText, LayoutDashboard, Settings, UserRound } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './components/ui/sidebar';
import { DocumentsPage } from './features/dashboard/documents-page';
import { JobsPage } from './features/dashboard/jobs-page';
import { ProfilePage } from './features/dashboard/profile-page';
import { ApplicationsPage } from './features/dashboard/applications-page';
import { SettingsPage } from './features/dashboard/settings-page';
import { StartApplicationFlow } from './features/application/start-application-flow';
import { useActiveBackendProfile } from './features/profile/use-active-backend-profile';
import { AgentUnavailableBanner } from './features/ai/agent-unavailable-banner';
import { useEnsureAiDefault } from './features/ai/use-ensure-ai-default';

const navigation = [
  ['profile', 'Profile', UserRound], ['jobs', 'Browse Jobs', Briefcase],
  ['documents', 'Documents', FileText], ['applications', 'Applications', LayoutDashboard],
] as const;

export default function App() {
  return <HashRouter>
    <DashboardShell />
  </HashRouter>;
}

function DashboardShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeProfile = useActiveBackendProfile();
  const aiDefault = useEnsureAiDefault();
  const section = location.pathname.slice(1).split('/')[0] || 'profile';
  const identity = profileIdentity(activeProfile);

  return <SidebarProvider>
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
              <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm">JC</div>
              <div className="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold">Job Copilot</span>
                <span className="truncate text-xs text-muted-foreground">Free plan</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map(([id, label, Icon]) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton isActive={section === id} tooltip={label} onClick={() => navigate(`/${id}`)}>
                    <Icon size={18} /><span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={section === 'settings'} tooltip="Settings" onClick={() => navigate('/settings')}>
              <Settings size={18} /><span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent" tooltip={identity.name}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{identity.initials}</div>
              <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium">{identity.name}</span>
                <span className="truncate text-xs text-muted-foreground">{identity.email}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset className="h-svh overflow-hidden bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-card/95 px-6 py-3.5 shadow-[0_1px_0_0_var(--border)] backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <strong className="text-sm font-semibold text-foreground">Dashboard</strong>
        </div>
        <DashboardProfileStatus active={activeProfile} />
      </header>
      <div className="flex flex-1 flex-col overflow-auto">
        <section className="flex min-h-0 flex-1 flex-col px-6 py-6">
          <AgentUnavailableBanner actionLabel="Open Settings" onAction={() => navigate('/settings')} />
          {aiDefault.notice ? <div className="ai-notice" role="status"><span>{aiDefault.notice}</span><button type="button" onClick={aiDefault.dismiss}>Dismiss</button></div> : null}
          <Routes>
            <Route index element={<Navigate to="/profile" replace />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="applications/:id/start" element={<StartApplicationFlow />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/profile" replace />} />
          </Routes>
        </section>
      </div>
      <footer className="flex justify-between bg-card/95 px-6 py-3 text-xs text-muted-foreground shadow-[0_-1px_0_0_var(--border)]">
        <span>Local backend data</span><span>Help · About</span>
      </footer>
    </SidebarInset>
  </SidebarProvider>;
}

function profileIdentity(active: ReturnType<typeof useActiveBackendProfile>): { name: string; email: string; initials: string } {
  if (active.state.status !== 'available') {
    return { name: 'No profile', email: 'Select a profile', initials: '—' };
  }
  const profile = active.state.profile;
  const name = profile.facts.find((fact) => fact.key === 'full_name')?.value ?? profile.display_name;
  const email = profile.facts.find((fact) => fact.key === 'email')?.value ?? profile.email ?? 'No email';
  const initials = name.trim().split(/\s+/).map((word) => word[0]).slice(0, 2).join('').toUpperCase() || 'U';
  return { name, email, initials };
}

function DashboardProfileStatus({ active }: { active: ReturnType<typeof useActiveBackendProfile> }) {
  if (active.state.status === 'loading') return <span className="profile-status">Loading profile…</span>;
  if (active.state.status === 'missing') return <span className="profile-status">No profile selected</span>;
  if (active.state.status === 'error') return <span className="profile-status error">Backend unavailable <button onClick={() => void active.refetch()}>Retry</button></span>;
  const name = active.state.profile.facts.find((fact) => fact.key === 'full_name')?.value ?? active.state.profile.display_name;
  return <span className={active.state.scanUnlocked ? 'ready' : 'profile-status warning'}>{name} · {active.state.scanUnlocked ? 'Ready ●' : 'Needs review'}</span>;
}
