import { ApplicationFilters } from '../tracking/application-filters';
import { ApplicationTable } from '../tracking/application-table';
import { MockDataNotice } from '../../components/states/mock-data-notice';

export function ApplicationsPage() {
  return <><div className="page-heading"><div><p className="eyebrow">Applications</p><h1>Application tracker</h1><p>Review durable mock application records and their current status.</p></div><ApplicationFilters /></div><MockDataNotice>Application records remain fictional until the application persistence API is connected.</MockDataNotice><ApplicationTable /></>;
}
