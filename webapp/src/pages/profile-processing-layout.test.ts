import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./documents.tsx', import.meta.url), 'utf8');

describe('non-blocking profile creation flow', () => {
  it('keeps creation on a durable processing URL and does not execute parsing in the browser', () => {
    expect(source).toContain('`/profile?creating=${id}`');
    expect(source).not.toContain('executeParse');
    expect(source).not.toContain('markParsing');
  });

  it('keeps the new-profile action visible while explaining the single-operation limit', () => {
    expect(source).toContain('One profile is already being prepared.');
    expect(source).toContain('disabled={!extractionSlotAvailable}');
  });
});
