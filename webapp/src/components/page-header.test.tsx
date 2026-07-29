// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageHeader } from './page-header';

vi.mock('../features/profile-switcher/profile-switcher', () => ({
  ProfileSwitcher: () => <button type="button">Profile menu</button>,
}));

afterEach(cleanup);

describe('PageHeader', () => {
  it('combines a top-level page title, actions, and global utilities', () => {
    render(
      <PageHeader
        title="Browse Jobs"
        description="Find your next role."
        actions={<button type="button">Page action</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Browse Jobs' })).toBeTruthy();
    expect(screen.getByText('Find your next role.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Page action' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Profile menu' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /back to/i })).toBeNull();
  });

  it('provides real parent navigation for a nested page', () => {
    const onBack = vi.fn();
    render(<PageHeader title="EM Profile" backLabel="Profiles" onBack={onBack} />);

    const back = screen.getByRole('button', { name: 'Back to Profiles' });
    expect(back.getAttribute('title')).toBe('Back to Profiles');
    expect(back.parentElement?.contains(screen.getByRole('heading', { name: 'EM Profile' }))).toBe(true);
    expect(screen.queryByText('Profiles')).toBeNull();

    fireEvent.click(back);
    expect(onBack).toHaveBeenCalledOnce();
  });
});
