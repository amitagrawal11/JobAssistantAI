import type { BackendProfile } from '../../schemas/backend';

export type ProfileProcessing = BackendProfile['processing'];

export function isProcessingActive(processing: ProfileProcessing): boolean {
  return processing?.status === 'pending' || processing?.status === 'running';
}

export function hasProcessingFailed(processing: ProfileProcessing): boolean {
  return processing?.status === 'failed';
}

export function profileStageLabel(processing: ProfileProcessing): string {
  switch (processing?.stage) {
    case 'uploading':
      return 'Uploading résumé…';
    case 'reading':
      return 'Reading résumé…';
    case 'extracting':
      return 'Extracting profile…';
    case 'failed':
      return processing.error_code === 'UPLOAD_INTERRUPTED'
        ? 'Résumé upload was interrupted'
        : processing.error_code === 'RESUME_READ_FAILED'
        ? 'Résumé could not be read'
        : processing.error_code === 'PROCESSING_INTERRUPTED'
          ? 'Processing was interrupted'
          : 'Profile extraction failed';
    case 'complete':
      return 'Profile ready';
    default:
      return '';
  }
}

export function formatStageDuration(durationMs: number): string {
  if (durationMs < 1_000) return '<1s';
  if (durationMs < 10_000) return `${(durationMs / 1_000).toFixed(1)}s`;
  if (durationMs < 60_000) return `${Math.round(durationMs / 1_000)}s`;
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.round((durationMs % 60_000) / 1_000);
  return seconds === 60 ? `${minutes + 1}m` : `${minutes}m ${seconds}s`;
}

export function currentStageDuration(processing: ProfileProcessing): string | null {
  if (!processing || processing.status === 'succeeded') return null;
  const timing = processing.stage_timings?.[processing.stage];
  return timing ? formatStageDuration(timing.duration_ms) : null;
}

const STAGE_NAMES: Record<string, string> = {
  uploading: 'Uploaded',
  reading: 'Read',
  extracting: 'Extracted',
};

export function completedStageDurations(processing: ProfileProcessing): string[] {
  if (!processing) return [];
  return ['uploading', 'reading', 'extracting'].flatMap((stage) => {
    const timing = processing.stage_timings?.[stage];
    return timing?.completed_at
      ? [`${STAGE_NAMES[stage]} ${formatStageDuration(timing.duration_ms)}`]
      : [];
  });
}

export function isProfileSelectable(
  profile: Pick<BackendProfile, 'processing' | 'readiness'>,
): boolean {
  return (
    !isProcessingActive(profile.processing) &&
    !hasProcessingFailed(profile.processing) &&
    (profile.readiness === 'needs_review' || profile.readiness === 'ready')
  );
}

export function activeProcessingCount(
  profiles: Array<Pick<BackendProfile, 'processing'>>,
): number {
  return profiles.filter((profile) => isProcessingActive(profile.processing)).length;
}

export function hasExtractionSlot(
  profiles: Array<Pick<BackendProfile, 'processing'>>,
): boolean {
  return activeProcessingCount(profiles) === 0;
}
