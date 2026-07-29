import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./applications.tsx', import.meta.url), 'utf8');

describe('Applications pipelines', () => {
  it('shows durable pipeline progress and ordered items', () => {
    expect(source).toContain('listAutoApplyPipelines');
    expect(source).toContain('Auto-Apply pipelines');
    expect(source).toContain('pipeline.completed_count');
    expect(source).toContain('pipeline.total_count');
    expect(source).toContain('<details');
    expect(source).toContain('pipeline.items.map');
  });
});
