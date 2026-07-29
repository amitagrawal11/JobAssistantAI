import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (name: string) =>
  readFileSync(new URL(`./${name}.tsx`, import.meta.url), 'utf8');

describe('integrated page headers', () => {
  it('uses the shared header on every top-level page', () => {
    for (const page of [
      'overview',
      'browse-jobs',
      'applications',
      'autoapply',
      'settings',
      'tailor',
      'documents',
    ]) {
      expect(source(page), page).toContain("import { PageHeader }");
      expect(source(page), page).toContain('<PageHeader');
    }
  });

  it('gives every route an explicit page frame and content scroller', () => {
    for (const page of [
      'overview',
      'applications',
      'autoapply',
      'settings',
      'tailor',
      'documents',
    ]) {
      expect(source(page), page).toContain("import { PageLayout");
      expect(source(page), page).toContain('<PageLayout');
      expect(source(page), page).toContain('<PageScrollArea');
    }
  });

  it('uses parent navigation only for nested Tailor and Profile views', () => {
    expect(source('tailor')).toContain('backLabel="Tailor Assistant"');
    expect(source('documents')).toContain('backLabel="Profiles"');
    expect(source('documents')).toContain("navigate('/profile?manage=1')");
  });

  it('uses the global profile selector as the Overview profile source', () => {
    expect(source('overview')).toContain('<PageHeader title="Overview" />');
    expect(source('overview')).not.toContain('Your job search at a glance');
    expect(source('overview')).not.toContain('Dashboard</span>');
    expect(source('overview')).not.toContain('setPicked');
  });

  it('does not repeat the selected profile label under the profile title', () => {
    expect(source('documents')).not.toContain('description={p.display_name}');
  });
});
