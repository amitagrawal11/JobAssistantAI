import { ApplicationFilters } from '../tracking/application-filters';
import { ApplicationTable } from '../tracking/application-table';

export function ApplicationsPage() {
  return <><div className="page-heading"><div><p className="eyebrow">Applications</p><h1>Application tracker</h1><p>Review durable mock application records and their current status.</p></div><ApplicationFilters /></div><ApplicationTable /></>;
}
