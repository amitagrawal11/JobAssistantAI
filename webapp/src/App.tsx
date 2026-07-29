import { useState, type ComponentType } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, UserRound, Briefcase, Sparkles, Layers, PieChart, Settings,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { OverviewPage } from './pages/overview';
import { ProfilePage } from './pages/documents';
import { BrowseJobsPage } from './pages/browse-jobs';
import { TailorPage } from './pages/tailor';
import { AutoApplyPage } from './pages/autoapply';
import { ApplicationsPage } from './pages/applications';
import { SettingsPage } from './pages/settings';

type NavItem = { icon: ComponentType<{ className?: string }>; path: string; label: string };

const NAV: NavItem[] = [
  { icon: LayoutGrid, path: '/overview', label: 'Overview' },
  { icon: UserRound, path: '/profile', label: 'Profile' },
  { icon: Briefcase, path: '/jobs', label: 'Browse Jobs' },
  { icon: Sparkles, path: '/tailor', label: 'Tailor Assistant' },
  { icon: Layers, path: '/autoapply', label: 'Auto-Apply Queue' },
  { icon: PieChart, path: '/applications', label: 'Applications' },
];

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const settingsActive = pathname.startsWith('/settings');
  return (
    <aside className={'flex shrink-0 flex-col transition-[width] duration-200 ' + (collapsed ? 'w-14' : 'w-56')}>
      <div className={'flex h-16 shrink-0 items-center gap-2.5 ' + (collapsed ? 'justify-center' : 'px-4')}>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_oklch(0.58_0.2_265_/_0.6)]"><Sparkles className="size-4.5" /></div>
        {!collapsed ? <span className="text-[15px] font-bold tracking-[-0.02em] text-foreground">Pathway</span> : null}
      </div>

      <div className={'flex flex-1 flex-col overflow-y-auto py-3 ' + (collapsed ? 'items-center px-2' : 'px-3')}>
      <button
        type="button"
        title="Toggle sidebar"
        onClick={onToggle}
        className={'flex items-center rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground ' + (collapsed ? 'size-10 justify-center' : 'w-full gap-3 px-3 py-2')}
      >
        {collapsed ? <ChevronsRight className="size-5" /> : <><ChevronsLeft className="size-5 shrink-0" /><span>Collapse</span></>}
      </button>

      <div className={'my-3 h-px bg-foreground/10 ' + (collapsed ? 'w-8' : 'w-full')} />

      <nav className={'flex flex-col gap-1 ' + (collapsed ? 'items-center' : '')}>
        {NAV.map(({ icon: Icon, path, label }) => {
          const active = pathname.startsWith(path);
          return (
            <button
              key={path}
              type="button"
              title={collapsed ? label : undefined}
              onClick={() => {
                if (path === '/profile') {
                  navigate('/profile?manage=1');
                  return;
                }
                navigate(path);
              }}
              className={
                'flex items-center rounded-xl text-sm font-medium transition-colors ' +
                (collapsed ? 'size-10 justify-center ' : 'w-full gap-3 px-3 py-2 ') +
                (active ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground')
              }
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed ? <span className="truncate">{label}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className={'mt-auto flex flex-col gap-1 ' + (collapsed ? 'items-center' : '')}>
        <button
          type="button"
          title={collapsed ? 'Settings' : undefined}
          onClick={() => navigate('/settings')}
          className={
            'flex items-center rounded-xl text-sm font-medium transition-colors ' +
            (collapsed ? 'size-10 justify-center ' : 'w-full gap-3 px-3 py-2 ') +
            (settingsActive ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground')
          }
        >
          <Settings className="size-5 shrink-0" />{!collapsed ? <span>Settings</span> : null}
        </button>
        <div className={'mt-1 flex items-center gap-2.5 rounded-xl ' + (collapsed ? 'justify-center' : 'px-1 py-1.5')}>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-[11px] font-semibold text-foreground">JR</div>
          {!collapsed ? <div className="min-w-0 leading-tight"><p className="truncate text-[13px] font-medium text-foreground">Jordan Reyes</p><p className="truncate text-[11px] text-muted-foreground">jordan.reyes@mail.com</p></div> : null}
        </div>
      </div>
      </div>
    </aside>
  );
}

function Shell() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="app-gradient flex h-svh gap-1 overflow-hidden p-2 text-foreground">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main className="content-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-[20px]">
        <div className="min-h-0 flex-1 overflow-hidden px-6 py-4">
          <Routes>
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/resume" element={<Navigate to="/profile" replace />} />
            <Route path="/jobs" element={<BrowseJobsPage />} />
            <Route path="/tailor" element={<TailorPage />} />
            <Route path="/autoapply" element={<AutoApplyPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
