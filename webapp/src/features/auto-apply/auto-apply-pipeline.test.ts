import { describe, expect, it } from 'vitest';
import { orderedSelectedJobs, withoutSelectedJob } from './auto-apply-pipeline';

const jobs = [
  { id: 'a', title: 'A' },
  { id: 'b', title: 'B' },
  { id: 'c', title: 'C' },
];

describe('Auto-Apply pipeline review helpers', () => {
  it('keeps selected jobs in visible card order', () => {
    expect(orderedSelectedJobs(jobs, new Set(['c', 'a'])).map((job) => job.id))
      .toEqual(['a', 'c']);
  });

  it('removes only the requested job from review selection', () => {
    expect([...withoutSelectedJob(new Set(['a', 'b']), 'a')]).toEqual(['b']);
  });
});
