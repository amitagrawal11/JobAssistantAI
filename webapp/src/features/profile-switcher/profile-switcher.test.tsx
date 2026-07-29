// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/active-profile', () => ({
  clearActiveProfileId: vi.fn(),
  setActiveProfileId: vi.fn(),
  useActiveProfileId: vi.fn(() => null),
}));
import {
  resolveHeaderProfile,
  type HeaderProfile,
} from './profile-switcher-state';
import { ProfileSwitcherView } from './profile-switcher';

const profile = (id: string, name: string, isDefault = false): HeaderProfile => ({
  id,
  display_name: name,
  is_default: isDefault,
  readiness: 'needs_review',
  processing: null,
});

afterEach(cleanup);

describe('resolveHeaderProfile', () => {
  it('returns no selection when there are no profiles', () => {
    expect(resolveHeaderProfile([], null)).toEqual({ selected: null, shouldPersist: false });
  });

  it('selects and persists the only profile', () => {
    const only = profile('one', 'Engineering', true);
    expect(resolveHeaderProfile([only], null)).toEqual({ selected: only, shouldPersist: true });
  });

  it('keeps a valid active profile even when another profile is default', () => {
    const first = profile('one', 'Engineering', true);
    const second = profile('two', 'Management');
    expect(resolveHeaderProfile([first, second], 'two')).toEqual({
      selected: second,
      shouldPersist: false,
    });
  });

  it('falls back to and persists the default for a stale selection', () => {
    const fallback = profile('one', 'Engineering', true);
    expect(resolveHeaderProfile([fallback, profile('two', 'Management')], 'deleted')).toEqual({
      selected: fallback,
      shouldPersist: true,
    });
  });
});

describe('ProfileSwitcherView', () => {
  it('offers profile creation when no profiles exist', () => {
    const onManage = vi.fn();
    render(
      <ProfileSwitcherView
        profiles={[]}
        activeProfileId={null}
        loading={false}
        error={false}
        onSelect={vi.fn()}
        onManage={onManage}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /create profile/i }));
    expect(onManage).toHaveBeenCalled();
  });

  it('opens the profile dropdown when only one profile exists', () => {
    const onManage = vi.fn();
    render(
      <ProfileSwitcherView
        profiles={[profile('one', 'Engineering', true)]}
        activeProfileId="one"
        loading={false}
        error={false}
        onSelect={vi.fn()}
        onManage={onManage}
      />,
    );
    const button = screen.getByRole('button', { name: /engineering/i });
    expect(button.getAttribute('aria-haspopup')).toBe('listbox');

    fireEvent.click(button);
    expect(screen.getByRole('listbox', { name: /profiles/i })).toBeTruthy();
    expect(
      screen.getByRole('option', { name: /engineering/i }).getAttribute('aria-selected'),
    ).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /manage profiles/i }));
    expect(onManage).toHaveBeenCalledOnce();
  });

  it('switches profiles from a multi-profile dropdown', () => {
    const onSelect = vi.fn();
    render(
      <ProfileSwitcherView
        profiles={[
          profile('one', 'Engineering', true),
          profile('two', 'Management'),
        ]}
        activeProfileId="one"
        loading={false}
        error={false}
        onSelect={onSelect}
        onManage={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /engineering/i }));
    fireEvent.click(screen.getByRole('option', { name: /management/i }));
    expect(onSelect).toHaveBeenCalledWith('two');
  });

  it('shows processing globally without allowing the incomplete profile to be selected', () => {
    const onSelect = vi.fn();
    render(
      <ProfileSwitcherView
        profiles={[
          profile('one', 'Engineering Manager', true),
          {
            ...profile('two', 'Staff Engineer'),
            readiness: 'uploaded',
            processing: {
              operation_id: '11111111-1111-4111-8111-111111111111',
              source_document_id: '22222222-2222-4222-8222-222222222222',
              status: 'running',
              stage: 'reading',
              error_code: null,
              retryable: false,
              started_at: '2026-07-30T00:00:00Z',
              completed_at: null,
              stage_timings: {},
            },
          },
        ]}
        activeProfileId="one"
        loading={false}
        error={false}
        onSelect={onSelect}
        onManage={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /engineering manager.*1 processing/i }));
    const processingOption = screen.getByRole('option', { name: /staff engineer.*reading résumé/i });
    expect(processingOption.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(processingOption);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
