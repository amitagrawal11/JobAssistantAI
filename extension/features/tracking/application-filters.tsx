import { Button } from '../../components/ui/button';
import { useApplicationStore } from '../../stores/react';
import type { ApplicationFilter } from '../../stores/state';

const filters: ApplicationFilter[] = ['all', 'active', 'applied', 'closed'];
export function ApplicationFilters() {
  const current = useApplicationStore((state) => state.applicationFilter);
  const setFilter = useApplicationStore((state) => state.setApplicationFilter);
  return <div className="segmented" aria-label="Application filters">{filters.map((filter) => <Button key={filter} size="sm" variant={current === filter ? 'primary' : 'secondary'} onClick={() => setFilter(filter)}>{filter[0].toUpperCase() + filter.slice(1)}</Button>)}</div>;
}
