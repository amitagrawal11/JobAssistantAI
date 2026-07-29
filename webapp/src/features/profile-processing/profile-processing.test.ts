import { describe, expect, it } from 'vitest';
import type { BackendProfile } from '../../schemas/backend';
import {
  activeProcessingCount,
  hasExtractionSlot,
  isProfileSelectable,
  profileStageLabel,
} from './profile-processing';

const processing = {
  operation_id: '11111111-1111-4111-8111-111111111111',
  source_document_id: '22222222-2222-4222-8222-222222222222',
  status: 'running' as const,
  stage: 'reading' as const,
  error_code: null,
  retryable: false,
  started_at: '2026-07-30T00:00:00Z',
  completed_at: null,
  stage_timings: {
    uploading: {
      started_at: '2026-07-30T00:00:00Z',
      completed_at: '2026-07-30T00:00:01.200Z',
      duration_ms: 1200,
    },
    reading: {
      started_at: '2026-07-30T00:00:01.200Z',
      completed_at: null,
      duration_ms: 4200,
    },
  },
};

describe('profile processing state', () => {
  it('uses clear user-facing stage labels', () => {
    expect(profileStageLabel(processing)).toBe('Reading résumé…');
  });

  it('does not allow an incomplete profile to become active', () => {
    expect(
      isProfileSelectable({
        readiness: 'uploaded',
        processing,
      } as Pick<BackendProfile, 'processing' | 'readiness'>),
    ).toBe(false);
  });

  it('allows a completed profile to become active', () => {
    expect(
      isProfileSelectable({
        readiness: 'needs_review',
        processing: { ...processing, status: 'succeeded', stage: 'complete' },
      } as Pick<BackendProfile, 'processing' | 'readiness'>),
    ).toBe(true);
  });

  it('counts active work and closes the free extraction slot', () => {
    const profiles = [{ processing }, { processing: null }];
    expect(activeProcessingCount(profiles)).toBe(1);
    expect(hasExtractionSlot(profiles)).toBe(false);
  });
});
