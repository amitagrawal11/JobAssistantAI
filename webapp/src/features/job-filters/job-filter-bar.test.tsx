// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_JOB_FILTERS } from './job-filter-state';
import { ApplicationMethodToggle, JobFilterBar, JobSortControl } from './job-filter-bar';

const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

afterEach(() => {
  cleanup();
  HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
});

describe('JobFilterBar', () => {
  it('always keeps one count-free Application Method segment selected', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ApplicationMethodToggle values={[]} onChange={onChange} />,
    );

    const apply = screen.getByRole('button', { name: 'Apply' });
    const quickApply = screen.getByRole('button', { name: 'Quick Apply' });
    expect(apply.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText('389')).toBeNull();
    fireEvent.click(apply);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(quickApply);
    expect(onChange).toHaveBeenLastCalledWith(['quick_apply']);

    rerender(
      <ApplicationMethodToggle values={['quick_apply']} onChange={onChange} />,
    );
    expect(screen.getByRole('button', { name: 'Quick Apply' }).getAttribute('aria-pressed'))
      .toBe('true');
    onChange.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Quick Apply' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('orders collapsed filters by job-seeker intent', () => {
    render(
      <JobFilterBar
        value={DEFAULT_JOB_FILTERS}
        facets={{ facets: {} }}
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );

    const filterNames = screen.getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent?.trim())
      .filter((name) => [
        'Skills', 'Role', 'Location', 'Workplace', 'Experience Level',
        'Job Type', 'Companies', 'All filters',
      ].includes(name ?? ''));

    expect(filterNames).toEqual([
      'Skills', 'Role', 'Location', 'Workplace', 'Experience Level',
      'Job Type', 'Companies', 'All filters',
    ]);
  });

  it('orders secondary filters from application constraints to candidate state', () => {
    render(
      <JobFilterBar
        value={DEFAULT_JOB_FILTERS}
        facets={{ facets: {} }}
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /all filters/i }));
    const filterNames = screen.getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent?.trim())
      .filter((name) => [
        'Visa Sponsorship', 'Languages',
        'ATS Source', 'Profile Match', 'Previously Handled',
      ].includes(name ?? ''));

    expect(filterNames).toEqual([
      'Visa Sponsorship', 'Languages',
      'ATS Source', 'Profile Match', 'Previously Handled',
    ]);
  });

  it('keeps Application Method outside the filter panel', () => {
    render(
      <JobFilterBar
        value={DEFAULT_JOB_FILTERS}
        facets={{
          facets: {
            application_method: [
              { value: 'company_site', label: 'Company Site', count: 6193 },
              { value: 'quick_apply', label: 'Quick Apply', count: 389 },
            ],
          },
        }}
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /all filters/i }));
    expect(screen.queryByRole('group', { name: 'Application Method' })).toBeNull();
  });

  it('keeps sorting outside the filter expansion', () => {
    render(
      <JobFilterBar
        value={DEFAULT_JOB_FILTERS}
        facets={{ facets: {} }}
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /all filters/i }));
    expect(screen.queryByLabelText(/sort results/i)).toBeNull();
  });

  it('renders a standalone sort control with profile-aware choices', () => {
    const onChange = vi.fn();
    render(
      <JobSortControl
        value="newest"
        activeProfileId={null}
        onChange={onChange}
      />,
    );

    const select = screen.getByLabelText(/sort results/i) as HTMLSelectElement;
    expect(select.value).toBe('newest');
    expect(select.className).toContain('appearance-none');
    expect(select.className).toContain('pr-8');
    expect(select.parentElement?.querySelector('svg.pointer-events-none')).toBeTruthy();
    expect(screen.queryByRole('option', { name: /best match/i, hidden: true })).toBeNull();
    fireEvent.change(select, { target: { value: 'oldest' } });
    expect(onChange).toHaveBeenCalledWith('oldest');
  });

  it('animates the advanced filter height and respects reduced motion', () => {
    render(
      <JobFilterBar
        value={DEFAULT_JOB_FILTERS}
        facets={{ facets: {} }}
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );

    const panel = screen.getByTestId('advanced-filter-panel');
    expect(panel.className).toContain('grid-rows-[0fr]');
    expect(panel.className).toContain('transition-[grid-template-rows]');
    expect(panel.className).toContain('motion-reduce:transition-none');

    fireEvent.click(screen.getByRole('button', { name: /all filters/i }));
    expect(panel.className).toContain('grid-rows-[1fr]');
  });

  it('omits retired filters and unknown choices', () => {
    render(
      <JobFilterBar
        value={DEFAULT_JOB_FILTERS}
        facets={{
          facets: {
            workplace_type: [
              { value: 'unknown', label: 'Unknown', count: 100 },
              { value: 'remote', label: 'Remote', count: 20 },
            ],
          },
        }}
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /all filters/i }));
    for (const name of [
      'Max Experience', 'Degree Level', 'Industry', 'Travel',
      'Minimum salary', 'Maximum salary', 'Minimum match score',
      'Missing required skills', 'Posted after', 'Posted before',
    ]) {
      expect(screen.queryByLabelText(new RegExp(name, 'i'))).toBeNull();
      expect(screen.queryByRole('button', { name: new RegExp(name, 'i') })).toBeNull();
    }

    fireEvent.click(screen.getByRole('button', { name: /workplace/i }));
    expect(screen.queryByRole('button', { name: /^unknown\b/i })).toBeNull();
    expect(screen.getByRole('button', { name: /^remote\b/i })).toBeTruthy();
  });

  it('does not expose the generic other value as a Job Type choice', () => {
    render(
      <JobFilterBar
        value={DEFAULT_JOB_FILTERS}
        facets={{
          facets: {
            employment_type: [
              { value: 'other', label: 'Other', count: 97 },
              { value: 'contract', label: 'Contract', count: 42 },
            ],
          },
        }}
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Job Type' }));
    expect(screen.queryByRole('button', { name: /other/i })).toBeNull();
    expect(screen.getByRole('button', { name: /contract/i })).toBeTruthy();
  });

  it('shows selected filter values directly in the filter button', () => {
    render(
      <JobFilterBar
        value={{
          ...DEFAULT_JOB_FILTERS,
          workplaceTypes: ['remote'],
          skills: ['react', 'typescript', 'go'],
        }}
        facets={{ facets: {} }}
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Workplace: Remote' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /all filters/i }));
    expect(screen.getByRole('button', { name: 'Skills: React, Typescript, Go' }).textContent)
      .toContain('Skills: React +2');
  });

  it('aligns a right-edge dropdown inward to avoid horizontal overflow', () => {
    HTMLElement.prototype.getBoundingClientRect = () => ({
      bottom: 80, height: 32, left: 900, right: 1000, top: 48, width: 100,
      x: 900, y: 48, toJSON: () => ({}),
    });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });

    render(
      <JobFilterBar
        value={DEFAULT_JOB_FILTERS}
        facets={{ facets: { company: [{ value: 'OpenAI', label: 'OpenAI', count: 20 }] } }}
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /companies/i }));

    const menu = screen.getByTestId('facet-menu-Companies');
    expect(menu.parentElement).toBe(document.body);
    expect(menu.style.position).toBe('fixed');
    expect(menu.style.left).toBe('712px');
  });

  it('renders an advanced dropdown outside the animated overflow panel', () => {
    render(
      <JobFilterBar
        value={DEFAULT_JOB_FILTERS}
        facets={{ facets: {} }}
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /all filters/i }));
    fireEvent.click(screen.getByRole('button', { name: /visa sponsorship/i }));

    const panel = screen.getByTestId('advanced-filter-panel');
    const menu = screen.getByTestId('facet-menu-Visa Sponsorship');
    expect(panel.contains(menu)).toBe(false);
    expect(menu.parentElement).toBe(document.body);
  });

  it('uses the full search wrappers as the focus-visible surface', () => {
    render(
      <JobFilterBar
        value={{ ...DEFAULT_JOB_FILTERS, include: ['frontend'] }}
        facets={{ facets: {} }}
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );

    for (const placeholder of [
      /search title, company, skill or keyword/i,
      /exclude keywords/i,
    ]) {
      const input = screen.getByPlaceholderText(placeholder);
      const wrapper = input.closest('label');

      expect(wrapper?.className).toContain('focus-within:outline');
      expect(input.className).toContain('focus-visible:!outline-none');
    }
    expect(screen.getByRole('button', { name: /clear search/i }).className)
      .toContain('focus-visible:!outline-none');
  });

  it('shows a shimmer instead of an empty dynamic facet while counts load', () => {
    render(
      <JobFilterBar
        value={DEFAULT_JOB_FILTERS}
        facets={undefined}
        facetsLoading
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /companies/i }));

    expect(screen.getByRole('status', { name: /loading companies/i })).toBeTruthy();
    expect(screen.queryByText(/no values in current results/i)).toBeNull();
  });

  it('exposes the remaining enrichment and candidate filter groups', () => {
    render(
      <JobFilterBar
        value={DEFAULT_JOB_FILTERS}
        facets={{ facets: {} }}
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /all filters/i }));
    for (const name of [
      'Visa Sponsorship', 'Skills', 'Languages', 'Profile Match', 'Previously Handled',
    ]) {
      expect(screen.getByRole('button', { name: new RegExp(name, 'i') })).toBeTruthy();
    }
    expect(screen.queryByLabelText(/sort results/i)).toBeNull();
  });

  it('keeps candidate controls disabled without a profile', () => {
    render(
      <JobFilterBar
        value={DEFAULT_JOB_FILTERS}
        facets={{ facets: {} }}
        activeProfileId={null}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /all filters/i }));
    expect((screen.getByRole('button', { name: /profile match/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('closes the active dropdown when another filter opens', () => {
    render(
      <JobFilterBar
        value={DEFAULT_JOB_FILTERS}
        facets={{ facets: {} }}
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /experience level/i }));
    expect(screen.getByPlaceholderText(/search experience level/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /companies/i }));

    expect(screen.queryByPlaceholderText(/search experience level/i)).toBeNull();
    expect(screen.getByRole('button', { name: /companies/i }).getAttribute('aria-expanded')).toBe('true');
  });

  it('closes the active dropdown when clicking outside the filter menu', () => {
    render(
      <JobFilterBar
        value={DEFAULT_JOB_FILTERS}
        facets={{ facets: {} }}
        activeProfileId="profile-1"
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /experience level/i }));
    expect(screen.getByPlaceholderText(/search experience level/i)).toBeTruthy();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByPlaceholderText(/search experience level/i)).toBeNull();
  });
});
