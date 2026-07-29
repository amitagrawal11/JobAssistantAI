import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./browse-jobs.tsx', import.meta.url), 'utf8');
const filterSource = readFileSync(
  new URL('../features/job-filters/job-filter-bar.tsx', import.meta.url),
  'utf8',
);

describe('Browse Jobs card layout', () => {
  it('scrolls only the results while keeping pagination outside the scroller', () => {
    expect(source).toContain("import { PageLayout }");
    expect(source).toContain('<PageLayout>');
    expect(source).toContain('data-testid="job-results-scroll"');
    expect(source).toContain('className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1"');

    const resultsStart = source.indexOf('data-testid="job-results-scroll"');
    const paginationStart = source.indexOf('{/* pagination */}');
    expect(resultsStart).toBeGreaterThan(-1);
    expect(paginationStart).toBeGreaterThan(resultsStart);
    expect(source.slice(paginationStart)).toContain('Page {filters.page} of {totalPages}');
  });

  it('separates Quick Apply bulk selection from the Auto-Apply queue', () => {
    expect(source).toContain(
      'const selectionMode = applicationSelectionMode(filters.applicationMethods)',
    );
    expect(source).not.toContain('enqueueAutoApply');
    expect(source).toContain(
      "selectionMode === 'quick_apply' ? 'Select' : 'Auto-apply'",
    );
    expect(source).toContain('Quick Apply selected');
    expect(source).toContain('runQuickApplyBatch');
    expect(source).toContain('setSelected(new Set())');
    expect(source).toContain("await recordApplication(job, 'quick_apply')");
  });

  it('reviews selected Auto-Apply jobs before starting a pipeline', () => {
    expect(source).toContain('Schedule Auto-Apply');
    expect(source).toContain('Review Auto-Apply pipeline');
    expect(source).toContain('Start now');
    expect(source).toContain('createAutoApplyPipeline');
    expect(source).toContain("navigate('/applications')");
  });

  it('keeps flexible space above chips and fixed spacing before the divider', () => {
    expect(source).toContain('<div className="flex min-h-0 flex-1 items-start justify-between gap-2">');
    expect(source).toContain('<div className="mt-3 flex items-center justify-between border-t border-border pt-3">');
    expect(source).not.toContain('<div className="mt-auto flex items-center justify-between border-t border-border pt-3">');
  });

  it('uses the same outlined treatment for Apply and Quick Apply actions', () => {
    expect(source).toContain('const AVAILABLE_ACTION_CLASS =');
    expect(source).toContain(
      "'border border-primary/45 bg-card text-primary shadow-sm hover:border-primary hover:bg-primary/5'",
    );
    expect(source).toContain(": AVAILABLE_ACTION_CLASS");
    expect(source).not.toContain(
      "'bg-primary text-primary-foreground shadow-[0_4px_11px_-5px_oklch(0.66_0.19_265_/_0.5)] hover:bg-[var(--primary-hover)]'",
    );
  });

  it('links the card header to the job and uses concise action labels', () => {
    expect(source).toContain('href={job.hosted_url}');
    expect(source).toContain('target="_blank"');
    expect(source).toContain('rel="noopener noreferrer"');
    expect(source).toContain(': <><ExternalLink className="size-3.5" /> Apply</>}');
    expect(source).not.toContain('View & Apply');
  });

  it('renders an explicit posted date and prioritized metadata instead of generic chips', () => {
    expect(source).toContain("import { formatPostedDate, jobCardMetadata }");
    expect(source).toContain("Posted {postedDate}");
    expect(source).toContain("jobCardMetadata(job).map");
    expect(source).not.toContain('function postedLabel');
    expect(source).not.toContain('{job.team ? <span');
    expect(source).not.toContain('{job.posted_at ? <span');
  });

  it('places the Application Method toggle immediately before Sort', () => {
    expect(source).toContain('ApplicationMethodToggle');
    const toggleIndex = source.indexOf('<ApplicationMethodToggle');
    const sortIndex = source.indexOf('<JobSortControl');
    expect(toggleIndex).toBeGreaterThan(-1);
    expect(sortIndex).toBeGreaterThan(toggleIndex);
    expect(source.slice(toggleIndex, sortIndex)).toContain('applicationMethods');
    expect(source).toContain('flex flex-wrap items-center justify-end gap-2');
  });

  it('defines a count-free animated Application Method control', () => {
    const methodControl = filterSource.slice(
      filterSource.indexOf('export function ApplicationMethodToggle'),
      filterSource.indexOf('export function JobFilterBar'),
    );
    expect(filterSource).toContain('export function ApplicationMethodToggle');
    expect(filterSource).toContain('duration-[260ms]');
    expect(filterSource).toContain('ease-[cubic-bezier(0.22,1,0.36,1)]');
    expect(filterSource).toContain('bg-muted/70');
    expect(filterSource).toContain('bg-card');
    expect(filterSource).toContain('border-primary/25');
    expect(methodControl.match(/rounded-full/g)?.length).toBeGreaterThanOrEqual(3);
    expect(methodControl).not.toContain('rounded-xl');
    expect(methodControl).not.toContain('rounded-lg');
    expect(filterSource).toContain('motion-reduce:transition-none');
    expect(methodControl).not.toContain('item.count');
    expect(filterSource).toContain("applicationMethods: ['company_site']");
  });
});
