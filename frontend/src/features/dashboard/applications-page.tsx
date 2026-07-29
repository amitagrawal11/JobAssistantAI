import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function ApplicationsPage() {
  const navigate = useNavigate();
  return <>
    <div className="page-heading">
      <div><p className="eyebrow">Applications</p><h1>Application tracker</h1><p>Saved backend application records will appear here.</p></div>
      <Button onClick={() => navigate('/applications/new/start')}><Plus /> Start Application</Button>
    </div>
    <section className="empty-source"><h2>No applications</h2><p>Application persistence is not backend-connected yet. No fictional applications are displayed.</p></section>
  </>;
}
