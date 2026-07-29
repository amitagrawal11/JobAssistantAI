import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Check, ChevronDown, LoaderCircle, Plus, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listProfiles } from '../../api/profiles';
import {
  setActiveProfileId,
  useActiveProfileId,
} from '../../lib/active-profile';
import { resolveHeaderProfile, type HeaderProfile } from './profile-switcher-state';
import {
  activeProcessingCount,
  hasProcessingFailed,
  isProcessingActive,
  isProfileSelectable,
  profileStageLabel,
} from '../profile-processing/profile-processing';

export function ProfileSwitcherView({
  profiles,
  activeProfileId,
  loading,
  error,
  onSelect,
  onManage,
  readyNotice,
}: {
  profiles: HeaderProfile[];
  activeProfileId: string | null | undefined;
  loading: boolean;
  error: boolean;
  onSelect: (profileId: string) => void;
  onManage: (focusProfileId?: string) => void;
  readyNotice?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { selected } = resolveHeaderProfile(profiles, activeProfileId);
  const processingCount = activeProcessingCount(profiles);
  const failedCount = profiles.filter((profile) => hasProcessingFailed(profile.processing)).length;

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  if (loading) {
    return <div role="status" aria-label="Loading profiles" className="h-9 w-36 animate-pulse rounded-full bg-muted" />;
  }

  if (error) {
    return (
      <button type="button" onClick={() => onManage()} className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-muted">
        <UserRound className="size-4" /> Profiles unavailable
      </button>
    );
  }

  if (profiles.length === 0) {
    return (
      <button type="button" onClick={() => onManage()} className="inline-flex h-9 items-center gap-2 rounded-full border border-primary/35 bg-primary/5 px-3 text-xs font-semibold text-primary hover:bg-primary/10">
        <Plus className="size-4" /> Create profile
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 max-w-56 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
      >
        <UserRound className="size-4 shrink-0 text-primary" />
        <span className="truncate">
          {selected?.display_name ?? (processingCount ? 'Profile processing' : 'Select profile')}
        </span>
        {processingCount ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-amber-700">
            <span className="size-1.5 rounded-full bg-amber-500" />
            {processingCount} processing
          </span>
        ) : readyNotice ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-emerald-700">
            <Check className="size-3" />
            Profile ready
          </span>
        ) : failedCount ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-rose-600">
            <span className="size-1.5 rounded-full bg-rose-500" />
            Needs attention
          </span>
        ) : null}
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
      <span className="sr-only" aria-live="polite">
        {processingCount ? `${processingCount} profile processing` : failedCount ? 'Profile needs attention' : ''}
      </span>
      {open ? (
        <div role="listbox" aria-label="Profiles" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-[var(--shadow-pop)]">
          {profiles.map((profile) => {
            const active = profile.id === selected?.id;
            const processing = isProcessingActive(profile.processing);
            const failed = hasProcessingFailed(profile.processing);
            const selectable = isProfileSelectable(profile);
            return (
              <button
                type="button"
                role="option"
                aria-selected={active}
                aria-disabled={!selectable}
                key={profile.id}
                onClick={() => {
                  if (processing) return;
                  if (failed) {
                    setOpen(false);
                    onManage(profile.id);
                    return;
                  }
                  if (!selectable) return;
                  onSelect(profile.id);
                  setOpen(false);
                }}
                className={'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs ' + (selectable || failed ? 'hover:bg-muted' : 'cursor-default')}
              >
                {processing ? <LoaderCircle className="size-3.5 shrink-0 animate-spin text-amber-600 motion-reduce:animate-none" /> : failed ? <AlertCircle className="size-3.5 shrink-0 text-rose-600" /> : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{profile.display_name}</span>
                  {processing || failed ? <span className={'mt-0.5 block text-[10px] ' + (failed ? 'text-rose-600' : 'text-amber-700')}>{profileStageLabel(profile.processing)}</span> : null}
                </span>
                {profile.is_default ? <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Default</span> : null}
                {active ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
              </button>
            );
          })}
          <div className="my-1 h-px bg-border" />
          <button type="button" onClick={() => { setOpen(false); onManage(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-primary hover:bg-primary/5">
            <UserRound className="size-3.5" /> Manage profiles
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ProfileSwitcher() {
  const navigate = useNavigate();
  const activeProfileId = useActiveProfileId();
  const profilesQuery = useQuery({
    queryKey: ['profiles'],
    queryFn: listProfiles,
    refetchInterval: (query) =>
      activeProcessingCount((query.state.data as HeaderProfile[] | undefined) ?? []) > 0
        ? 1500
        : false,
  });
  const profiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);
  const previousProcessingIds = useRef<Set<string> | null>(null);
  const [readyNotice, setReadyNotice] = useState<string | null>(null);
  const resolved = resolveHeaderProfile(profiles, activeProfileId);
  const resolvedProfileId = resolved.selected?.id;

  useEffect(() => {
    if (resolvedProfileId && resolved.shouldPersist) {
      void setActiveProfileId(resolvedProfileId);
    }
  }, [resolved.shouldPersist, resolvedProfileId]);

  useEffect(() => {
    const activeIds = new Set(
      profiles
        .filter((profile) => isProcessingActive(profile.processing))
        .map((profile) => profile.id),
    );
    const previous = previousProcessingIds.current;
    if (previous) {
      const completed = profiles.find(
        (profile) =>
          previous.has(profile.id) &&
          !activeIds.has(profile.id) &&
          profile.processing?.status === 'succeeded',
      );
      if (completed) setReadyNotice(completed.display_name);
    }
    previousProcessingIds.current = activeIds;
  }, [profiles]);

  useEffect(() => {
    if (!readyNotice) return;
    const timeout = window.setTimeout(() => setReadyNotice(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [readyNotice]);

  const manageProfiles = (focusProfileId?: string) => {
    navigate(`/profile?manage=1${focusProfileId ? `&focus=${focusProfileId}` : ''}`);
  };

  return (
    <ProfileSwitcherView
      profiles={profiles}
      activeProfileId={activeProfileId}
      loading={activeProfileId === undefined || profilesQuery.isLoading}
      error={profilesQuery.isError}
      onSelect={(profileId) => { void setActiveProfileId(profileId); }}
      onManage={manageProfiles}
      readyNotice={readyNotice}
    />
  );
}
