import { AlertCircle, FileText, RefreshCw, Trash2 } from 'lucide-react';
import type { BackendProfile } from '../../schemas/backend';
import {
  completedStageDurations,
  currentStageDuration,
  hasProcessingFailed,
  profileStageLabel,
} from './profile-processing';

export function ProfileProcessingCard({
  profile,
  onRetry,
  onDelete,
  busy = false,
  full = false,
}: {
  profile: BackendProfile;
  onRetry?: () => void;
  onDelete?: () => void;
  busy?: boolean;
  full?: boolean;
}) {
  const failed = hasProcessingFailed(profile.processing);
  const elapsed = currentStageDuration(profile.processing);
  const completed = completedStageDurations(profile.processing);
  return (
    <section
      aria-label={`${profile.display_name} ${failed ? 'needs attention' : 'processing'}`}
      className={
        (full ? 'mx-auto w-full max-w-2xl ' : 'min-h-[141px] ') +
        'rounded-xl border p-4 shadow-[var(--shadow-card)] ' +
        (failed ? 'border-rose-200 bg-rose-50/70' : 'border-amber-200 bg-amber-50/70')
      }
    >
      <div className="flex items-start gap-3">
        <span className={'grid size-9 shrink-0 place-items-center rounded-lg ' + (failed ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700')}>
          {failed ? <AlertCircle className="size-4" /> : <span aria-label="Processing" className="profile-shimmer size-5 rounded-md bg-amber-200" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[14px] font-semibold text-foreground">{profile.display_name}</h2>
              {profile.source_filename ? (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <FileText className="size-3 shrink-0" />
                  <span className="truncate">{profile.source_filename}</span>
                </p>
              ) : null}
            </div>
            <span className={'shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ' + (failed ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800')}>
              {failed ? 'Needs attention' : 'Processing'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <p className={'text-[12px] font-medium ' + (failed ? 'text-rose-700' : 'text-amber-800')}>
              {profileStageLabel(profile.processing)}
            </p>
            {elapsed ? <span className="shrink-0 text-[11px] tabular-nums text-amber-700">{elapsed}</span> : null}
          </div>
          {!failed ? (
            <>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-100">
                <div className="profile-shimmer h-full w-full rounded-full bg-amber-200" />
              </div>
              {completed.length ? <p className="mt-2 text-[10px] tabular-nums text-amber-700/80">{completed.join(' · ')}</p> : null}
              <p className="mt-2 text-[11px] text-muted-foreground">Safe to leave this page. We’ll keep working in the background.</p>
            </>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              {onRetry ? (
                <button type="button" disabled={busy} onClick={onRetry} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                  <RefreshCw className="size-3" /> Try again
                </button>
              ) : null}
              {onDelete ? (
                <button type="button" disabled={busy} onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50">
                  <Trash2 className="size-3" /> Delete
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
