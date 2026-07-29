import { useNavigate } from 'react-router-dom';

export type DashboardTarget = 'profile' | 'documents' | 'applications' | 'settings';

export function useOpenDashboard(): (section?: DashboardTarget) => void {
  const navigate = useNavigate();
  return (section: DashboardTarget = 'profile') => navigate(`/${section}`);
}
