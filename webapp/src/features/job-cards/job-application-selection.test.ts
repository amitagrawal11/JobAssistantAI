import { describe, expect, it, vi } from 'vitest';
import {
  applicationSelectionMode,
  runQuickApplyBatch,
} from './job-application-selection';

describe('job application selection', () => {
  it('maps application methods to separate selection pipelines', () => {
    expect(applicationSelectionMode(['quick_apply'])).toBe('quick_apply');
    expect(applicationSelectionMode(['company_site'])).toBe('auto_apply');
    expect(applicationSelectionMode([])).toBe('auto_apply');
  });

  it('submits quick applications sequentially and preserves failed ids', async () => {
    const active = new Set<string>();
    let maxConcurrent = 0;
    const onProgress = vi.fn();

    const result = await runQuickApplyBatch(
      ['one', 'two', 'three'],
      async (id) => {
        active.add(id);
        maxConcurrent = Math.max(maxConcurrent, active.size);
        await Promise.resolve();
        active.delete(id);
        if (id === 'two') throw new Error('failed');
      },
      onProgress,
    );

    expect(maxConcurrent).toBe(1);
    expect(result).toEqual({
      succeeded: ['one', 'three'],
      failed: ['two'],
    });
    expect(onProgress).toHaveBeenLastCalledWith({ completed: 3, total: 3 });
  });
});
