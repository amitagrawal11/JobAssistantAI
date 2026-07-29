export type ApplicationSelectionMode = 'auto_apply' | 'quick_apply';

export type QuickApplyBatchProgress = {
  completed: number;
  total: number;
};

export type QuickApplyBatchResult = {
  succeeded: string[];
  failed: string[];
};

export function applicationSelectionMode(
  methods: string[],
): ApplicationSelectionMode {
  return methods[0] === 'quick_apply' ? 'quick_apply' : 'auto_apply';
}

export async function runQuickApplyBatch(
  ids: string[],
  submit: (id: string) => Promise<void>,
  onProgress: (progress: QuickApplyBatchProgress) => void,
): Promise<QuickApplyBatchResult> {
  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const id of ids) {
    try {
      await submit(id);
      succeeded.push(id);
    } catch {
      failed.push(id);
    }
    onProgress({
      completed: succeeded.length + failed.length,
      total: ids.length,
    });
  }

  return { succeeded, failed };
}
