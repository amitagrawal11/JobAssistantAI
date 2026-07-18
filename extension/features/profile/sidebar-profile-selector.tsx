import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, RefreshCw } from 'lucide-react';
import { listProfiles } from '../../api/profiles';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/cn';
import { selectActiveProfile } from './profile-selection';

const readinessLabel = {
  uploaded: 'Resume uploaded',
  needs_review: 'Needs review',
  ready: 'Ready',
  parse_failed: 'Parse failed',
} as const;

export function SidebarProfileSelector({ activeProfileId }: { activeProfileId: string | null }) {
  const profiles = useQuery({ queryKey: ['profiles', 'list'], queryFn: listProfiles });
  const selection = useMutation({ mutationFn: selectActiveProfile });

  if (profiles.isPending) return <p className="profile-list-state">Loading profiles…</p>;
  if (profiles.isError) return <div className="profile-list-state"><p>{profiles.error.message}</p><Button variant="secondary" onClick={() => void profiles.refetch()}><RefreshCw size={14} /> Retry</Button></div>;
  if (profiles.data.length === 0) return <p className="profile-list-state">No profiles yet. Open Profile to upload a resume.</p>;

  return <div className="sidebar-profile-list" role="radiogroup" aria-label="Candidate profile">
    {profiles.data.map((profile) => {
      const selected = profile.id === activeProfileId;
      const displayName = profile.facts.find((fact) => fact.key === 'full_name')?.value ?? profile.display_name;
      return <button
        key={profile.id}
        type="button"
        role="radio"
        aria-checked={selected}
        className={cn('sidebar-profile-option', selected && 'selected')}
        disabled={selection.isPending}
        onClick={() => selection.mutate(profile)}
      >
        {selected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        <span><strong>{displayName}</strong><small>{profile.facts.length} extracted facts</small></span>
        <em className={cn(profile.readiness === 'ready' && 'ready')}>{readinessLabel[profile.readiness]}</em>
      </button>;
    })}
    {selection.isError ? <p className="form-error" role="alert">{selection.error.message}</p> : null}
  </div>;
}
