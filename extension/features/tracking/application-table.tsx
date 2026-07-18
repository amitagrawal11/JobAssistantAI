import { ExternalLink } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { useApplicationStore } from '../../stores/react';

export function ApplicationTable() {
  const applications = useApplicationStore((state) => state.applications);
  const filter = useApplicationStore((state) => state.applicationFilter);
  const visible = applications.filter((application) => filter === 'all' || filter === 'active' && ['draft','ready','interview'].includes(application.status) || filter === 'applied' && ['applied','interview','offer'].includes(application.status) || filter === 'closed' && ['rejected','withdrawn'].includes(application.status));
  return <div className="application-table" role="table"><div className="application-row header" role="row"><span>Company / role</span><span>ATS</span><span>Status</span><span>Score</span><span>Date</span><span>Source</span></div>{visible.map((application) => <div className="application-row" role="row" key={application.id}><span><strong>{application.company}</strong><small>{application.role}</small></span><span>{application.ats}</span><span><Badge className={`status-${application.status}`}>{application.status}</Badge></span><span>{application.score}%</span><span>{application.appliedDate ?? '—'}</span><a href={application.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open ${application.company} source`}><ExternalLink size={16} /></a></div>)}</div>;
}
