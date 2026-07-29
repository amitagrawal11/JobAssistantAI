import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');

describe('profile navigation', () => {
  it('opens profile management without clearing the selected profile', () => {
    expect(appSource).toContain("navigate('/profile?manage=1')");
    expect(appSource).not.toContain(
      "clearActiveProfileId().then(() => navigate(path))",
    );
  });
});

describe('shared page spacing', () => {
  it('removes the duplicate global header and uses an equal fixed page inset', () => {
    expect(appSource).toContain('className="min-h-0 flex-1 overflow-hidden px-6 py-4"');
    expect(appSource).not.toContain('className="min-h-0 flex-1 overflow-hidden p-6"');
    expect(appSource).not.toContain('flex-1 overflow-auto px-8 pb-7 pt-4');
    expect(appSource).not.toContain('function Breadcrumb()');
    expect(appSource).not.toContain('<header className=');
    expect(appSource).not.toContain('<ProfileSwitcher');
    expect(appSource).not.toContain('aria-label="Notifications"');
    expect(appSource).not.toContain('brand bar — same height/border as the main header');
  });
});
