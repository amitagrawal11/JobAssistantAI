export function isScanReadOnly(savedJob: unknown): boolean {
  return Boolean(
    savedJob
    && typeof savedJob === 'object'
    && 'description' in savedJob
    && typeof savedJob.description === 'string',
  );
}

export function backendMaxUnlocked({
  profileReady,
  hasJob,
  hasMatch,
  legacyIndex,
}: {
  profileReady: boolean;
  hasJob: boolean;
  hasMatch: boolean;
  legacyIndex: number;
}): number {
  if (!profileReady) return 0;
  if (!hasJob) return 1;
  if (!hasMatch) return 2;
  void legacyIndex;
  return 3;
}
