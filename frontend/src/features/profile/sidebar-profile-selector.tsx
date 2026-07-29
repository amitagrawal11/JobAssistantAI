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

  if (profiles.isPending) return <p className="text-sm text-muted-foreground">Loading profiles…</p>;
  if (profiles.isError) return <div className="space-y-2"><p className="text-sm text-destructive">{profiles.error.message}</p><Button variant="secondary" onClick={() => void profiles.refetch()}><RefreshCw size={14} /> Retry</Button></div>;
  if (profiles.data.length === 0) return <p className="text-sm text-muted-foreground">No profiles yet. Open Profile to upload a resume.</p>;

  return <div className="grid gap-2.5" role="radiogroup" aria-label="Candidate profile">
    {profiles.data.map((profile) => {
      const selected = profile.id === activeProfileId;
      const displayName = profile.facts.find((fact) => fact.key === 'full_name')?.value ?? profile.display_name;
      return <button
        key={profile.id}
        type="button"
        role="radio"
        aria-checked={selected}
        className={cn(
          'flex w-full items-center gap-3 rounded-md border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40',
          selected && 'border-primary ring-1 ring-primary/20',
        )}
        disabled={selection.isPending}
        onClick={() => selection.mutate(profile)}
      >
        {selected ? <CheckCircle2 size={18} className="shrink-0 text-primary" /> : <Circle size={18} className="shrink-0 text-muted-foreground" />}
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-semibold">{displayName}</strong>
          <small className="text-xs text-muted-foreground">{profile.facts.length} extracted facts</small>
        </span>
        <em className={cn('text-xs font-semibold not-italic whitespace-nowrap', profile.readiness === 'ready' ? 'text-[var(--success)]' : 'text-[var(--warning)]')}>{readinessLabel[profile.readiness]}</em>
      </button>;
    })}
    {selection.isError ? <p className="text-sm text-destructive" role="alert">{selection.error.message}</p> : null}
  </div>;
}
