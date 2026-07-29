// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import type { BackendProfile } from '../../schemas/backend';
import { ProfileProcessingCard } from './profile-processing-card';

const baseProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  display_name: 'Staff Engineer',
  email: null,
  readiness: 'uploaded',
  source_comparison_resolved: false,
  is_default: false,
  source_filename: 'staff-engineer.pdf',
  ai_preferences: {},
  contact: {},
  application_defaults: {},
  socials: {},
  custom_sections: [],
  facts: [],
  created_at: '2026-07-30T00:00:00Z',
  updated_at: '2026-07-30T00:00:00Z',
} satisfies Omit<BackendProfile, 'processing'>;

afterEach(cleanup);

describe('ProfileProcessingCard', () => {
  it('shows a non-blocking reading state', () => {
    render(
      <ProfileProcessingCard
        profile={{
          ...baseProfile,
          processing: {
            operation_id: '22222222-2222-4222-8222-222222222222',
            source_document_id: '33333333-3333-4333-8333-333333333333',
            status: 'running',
            stage: 'reading',
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
          },
        }}
      />,
    );
    expect(screen.getByText('Reading résumé…')).toBeTruthy();
    expect(screen.getByText('4.2s')).toBeTruthy();
    expect(screen.getByText('Uploaded 1.2s')).toBeTruthy();
    expect(screen.getByLabelText('Processing')).toBeTruthy();
    expect(document.querySelector('.animate-spin')).toBeNull();
    expect(screen.getByText(/safe to leave this page/i)).toBeTruthy();
  });

  it('offers retry and delete after failure', () => {
    const onRetry = vi.fn();
    const onDelete = vi.fn();
    render(
      <ProfileProcessingCard
        profile={{
          ...baseProfile,
          readiness: 'parse_failed',
          processing: {
            operation_id: '22222222-2222-4222-8222-222222222222',
            source_document_id: '33333333-3333-4333-8333-333333333333',
            status: 'failed',
            stage: 'failed',
            error_code: 'PROCESSING_INTERRUPTED',
            retryable: true,
            started_at: '2026-07-30T00:00:00Z',
            completed_at: '2026-07-30T00:16:00Z',
            stage_timings: {},
          },
        }}
        onRetry={onRetry}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
