import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpDown, Check, ChevronDown, Filter, RotateCcw, Search, X } from 'lucide-react';
import type { JobPostingFacetResponse } from '../../schemas/job-posting';
import {
  EMPLOYMENT_TYPES, EXPERIENCE_LEVELS,
  HANDLED_FILTERS, MATCH_LEVELS, ROLE_CATEGORIES, SORTS,
  SPONSORSHIP, WORKPLACE_TYPES, type JobFilterState,
} from './job-filter-state';

type Option = { value: string; label: string; count?: number };

const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const options = (values: readonly string[]): Option[] => values.map((value) => ({ value, label: label(value) }));
const DEFINITIONS: Array<{
  title: string;
  key: keyof JobFilterState;
  facet?: string;
  fallback?: readonly string[];
  candidate?: boolean;
}> = [
  { title: 'Skills', key: 'skills', facet: 'skill' },
  { title: 'Role', key: 'roleCategories', facet: 'role_category', fallback: ROLE_CATEGORIES },
  { title: 'Location', key: 'locations', facet: 'location' },
  { title: 'Workplace', key: 'workplaceTypes', facet: 'workplace_type', fallback: WORKPLACE_TYPES },
  { title: 'Experience Level', key: 'experienceLevels', facet: 'experience_level', fallback: EXPERIENCE_LEVELS },
  { title: 'Job Type', key: 'employmentTypes', facet: 'employment_type', fallback: EMPLOYMENT_TYPES },
  { title: 'Companies', key: 'companies', facet: 'company' },
  { title: 'Visa Sponsorship', key: 'sponsorship', facet: 'sponsorship', fallback: SPONSORSHIP },
  { title: 'Languages', key: 'languages', facet: 'language' },
  { title: 'ATS Source', key: 'vendors', facet: 'vendor' },
  { title: 'Profile Match', key: 'matchLevels', fallback: MATCH_LEVELS, candidate: true },
  { title: 'Previously Handled', key: 'handled', fallback: HANDLED_FILTERS, candidate: true },
];
const PRIMARY_FILTER_COUNT = 7;

export function JobSortControl({
  value, activeProfileId, onChange,
}: {
  value: string;
  activeProfileId: string | null | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <label className="inline-flex shrink-0 items-center gap-2 text-[13px] font-medium text-muted-foreground">
      <ArrowUpDown className="size-3.5" />
      <span>Sort</span>
      <span className="relative">
        <select
          aria-label="Sort results"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 appearance-none rounded-lg border border-border bg-card pl-2.5 pr-8 text-[13px] font-semibold text-foreground shadow-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/35"
        >
          {SORTS.filter((sort) => sort !== 'best_match' || activeProfileId).map(
            (sort) => <option key={sort} value={sort}>{label(sort)}</option>,
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  );
}

function FacetMenu({
  title, values, choices, disabled, loading, open, onOpenChange, onChange,
}: {
  title: string; values: string[]; choices: Option[]; disabled?: boolean;
  loading?: boolean;
  open: boolean; onOpenChange: (open: boolean) => void;
  onChange: (values: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [menuPosition, setMenuPosition] = useState({ left: 16, top: 16, width: 288, maxHeight: 360 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const visible = choices.filter(
    (item) => item.value.trim().toLowerCase() !== 'unknown'
      && item.label.trim().toLowerCase() !== 'unknown'
      && item.label.toLowerCase().includes(query.toLowerCase()),
  );
  const selectedLabels = values.map(
    (value) => choices.find((item) => item.value === value)?.label ?? label(value),
  );
  const buttonText = values.length
    ? `${title}: ${selectedLabels[0]}${values.length > 1 ? ` +${values.length - 1}` : ''}`
    : title;
  const accessibleLabel = values.length ? `${title}: ${selectedLabels.join(', ')}` : title;
  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const positionMenu = () => {
      const trigger = rootRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const menuWidth = Math.min(288, window.innerWidth - 32);
      const left = Math.max(
        16,
        Math.min(
          trigger.left + menuWidth > window.innerWidth - 16
            ? trigger.right - menuWidth
            : trigger.left,
          window.innerWidth - menuWidth - 16,
        ),
      );
      const menuHeight = menuRef.current?.offsetHeight || 360;
      const spaceBelow = window.innerHeight - trigger.bottom - 8;
      const spaceAbove = trigger.top - 8;
      const openAbove = menuHeight > spaceBelow && spaceAbove > spaceBelow;
      const availableHeight = Math.max(160, openAbove ? spaceAbove : spaceBelow);
      setMenuPosition({
        left,
        top: openAbove
          ? Math.max(8, trigger.top - Math.min(menuHeight, availableHeight) - 4)
          : trigger.bottom + 4,
        width: menuWidth,
        maxHeight: availableHeight,
      });
    };
    positionMenu();
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => {
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        onOpenChange(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [onOpenChange, open]);
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button" disabled={disabled} onClick={() => onOpenChange(!open)}
        aria-label={accessibleLabel}
        aria-controls={open ? `facet-menu-${title.replaceAll(' ', '-').toLowerCase()}` : undefined}
        title={values.length ? accessibleLabel : undefined}
        className={'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ' +
          (values.length ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground/80 hover:bg-muted')}
        aria-expanded={open}
      >
        {buttonText}<ChevronDown className="size-3.5 opacity-60" />
      </button>
      {open ? createPortal(
        <div
          ref={menuRef}
          id={`facet-menu-${title.replaceAll(' ', '-').toLowerCase()}`}
          data-testid={`facet-menu-${title}`}
          style={{
            position: 'fixed',
            left: `${menuPosition.left}px`,
            top: `${menuPosition.top}px`,
            width: `${menuPosition.width}px`,
            maxHeight: `${menuPosition.maxHeight}px`,
          }}
          className="z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-pop)]"
        >
          {choices.length > 7 ? (
            <input
              autoFocus value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${title.toLowerCase()}…`}
              className="mb-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
            />
          ) : null}
          <div className="min-h-0 flex-1 overflow-auto">
            {loading ? (
              <div role="status" aria-label={`Loading ${title.toLowerCase()}`} className="space-y-2 px-2 py-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex animate-pulse items-center gap-2 py-1">
                    <span className="size-4 rounded border border-border bg-muted" />
                    <span className={'h-3 rounded bg-muted ' + (index % 2 ? 'w-3/5' : 'w-4/5')} />
                    <span className="ml-auto h-3 w-8 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : visible.length ? visible.map((item) => {
              const checked = values.includes(item.value);
              return (
                <button
                  type="button" key={item.value}
                  onClick={() => onChange(checked ? values.filter((value) => value !== item.value) : [...values, item.value])}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-muted"
                >
                  <span className={'grid size-4 place-items-center rounded border ' + (checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                    {checked ? <Check className="size-3" /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.count !== undefined ? <span className="text-muted-foreground">{item.count}</span> : null}
                </button>
              );
            }) : <p className="px-2 py-4 text-center text-xs text-muted-foreground">No values in current results</p>}
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2">
            <button type="button" onClick={() => onChange([])} className="text-xs font-medium text-muted-foreground hover:text-foreground">Clear</button>
            <button type="button" onClick={() => onOpenChange(false)} className="text-xs font-semibold text-primary">Done</button>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

export function ApplicationMethodToggle({
  values, onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const selected = values[0] ?? 'company_site';
  const choices = [
    { value: 'company_site', label: 'Apply' },
    { value: 'quick_apply', label: 'Quick Apply' },
  ];

  return (
    <div
      role="group"
      aria-label="Application Method"
      className="relative grid h-9 shrink-0 grid-cols-2 rounded-full border border-border/70 bg-muted/70 p-1"
    >
      <span
        aria-hidden="true"
        style={{
          transform: selected === 'quick_apply'
            ? 'translateX(100%)'
            : 'translateX(0)',
        }}
        className={
          'pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full border border-primary/25 bg-card shadow-sm transition-[transform,opacity] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none opacity-100'
        }
      />
      {choices.map((item) => {
        const pressed = selected === item.value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => {
              if (!pressed) onChange([item.value]);
            }}
            className={
              'relative z-10 min-w-20 rounded-full px-3 text-[13px] font-semibold transition-colors duration-[260ms] motion-reduce:transition-none ' +
              (pressed
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function JobFilterBar({
  value, facets, facetsLoading = false, activeProfileId, onChange,
}: {
  value: JobFilterState;
  facets?: JobPostingFacetResponse;
  facetsLoading?: boolean;
  activeProfileId: string | null | undefined;
  onChange: (value: JobFilterState) => void;
}) {
  const [includeText, setIncludeText] = useState(value.include.join(', '));
  const [excludeText, setExcludeText] = useState(value.exclude.join(', '));
  const [showAll, setShowAll] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  useEffect(() => setIncludeText(value.include.join(', ')), [value.include]);
  useEffect(() => setExcludeText(value.exclude.join(', ')), [value.exclude]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const include = includeText.split(',').map((item) => item.trim()).filter(Boolean);
      const exclude = excludeText.split(',').map((item) => item.trim()).filter(Boolean);
      if (include.join('|') !== value.include.join('|') || exclude.join('|') !== value.exclude.join('|')) {
        onChange({ ...value, include, exclude, page: 1 });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [includeText, excludeText, onChange, value]);

  const activeCount = useMemo(() => {
    let count = 0;
    for (const definition of DEFINITIONS) count += (value[definition.key] as string[]).length;
    return count + value.include.length + value.exclude.length;
  }, [value]);
  const set = <K extends keyof JobFilterState>(key: K, next: JobFilterState[K]) =>
    onChange({ ...value, [key]: next, page: 1, ...(DEFINITIONS.find((item) => item.key === key)?.candidate && activeProfileId ? { profileId: activeProfileId } : {}) });
  const renderDefinition = (definition: (typeof DEFINITIONS)[number]) => {
    const facetChoices = definition.facet ? facets?.facets[definition.facet] : undefined;
    const availableChoices = facetChoices?.length
      ? facetChoices
      : options(definition.fallback ?? []);
    const choices = definition.key === 'employmentTypes'
      ? availableChoices.filter((item) => item.value !== 'other')
      : availableChoices;
    return (
      <FacetMenu
        key={definition.title} title={definition.title}
        values={value[definition.key] as string[]}
        choices={choices}
        disabled={definition.candidate && !activeProfileId}
        loading={Boolean(
          definition.facet
          && facetsLoading
          && !facetChoices?.length
          && !definition.fallback?.length
        )}
        open={activeMenu === definition.title}
        onOpenChange={(open) => setActiveMenu(open ? definition.title : null)}
        onChange={(next) => set(definition.key, next as never)}
      />
    );
  };

  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.38fr)]">
        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:outline focus-within:outline-[3px] focus-within:outline-[var(--focus)] focus-within:outline-offset-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={includeText} onChange={(event) => setIncludeText(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            placeholder="Search title, company, skill or keyword…"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm focus-visible:!outline-none"
          />
          {includeText ? <button type="button" onClick={() => setIncludeText('')} aria-label="Clear search" className="focus-visible:!outline-none"><X className="size-4 text-muted-foreground" /></button> : null}
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:outline focus-within:outline-[3px] focus-within:outline-[var(--focus)] focus-within:outline-offset-2">
          <span className="text-xs font-semibold text-muted-foreground">NOT</span>
          <input
            value={excludeText} onChange={(event) => setExcludeText(event.target.value)}
            placeholder="Exclude keywords…"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm focus-visible:!outline-none"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {DEFINITIONS.slice(0, PRIMARY_FILTER_COUNT).map(renderDefinition)}
        <button
          type="button"
          aria-expanded={showAll}
          aria-controls="advanced-job-filters"
          onClick={() => {
            setActiveMenu(null);
            setShowAll((current) => !current);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[13px] font-semibold text-primary hover:bg-muted"
        >
          <Filter className="size-3.5" /> {showAll ? 'Fewer filters' : `All filters${activeCount ? ` · ${activeCount}` : ''}`}
        </button>
        {activeCount ? (
          <button type="button" onClick={() => onChange({ ...value, include: [], exclude: [], locations: [], workplaceTypes: [], companies: [], roleCategories: [], employmentTypes: [], experienceLevels: [], applicationMethods: ['company_site'], vendors: [], sponsorship: [], skills: [], languages: [], matchLevels: [], handled: [], sort: 'newest', page: 1 })} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <RotateCcw className="size-3.5" /> Clear all
          </button>
        ) : null}
      </div>

      <div
        id="advanced-job-filters"
        data-testid="advanced-filter-panel"
        aria-hidden={!showAll}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          showAll ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className={`flex flex-wrap items-center gap-2 border-t border-border pt-3 transition-[margin,opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
            showAll
              ? 'visible mt-3 translate-y-0 opacity-100'
              : 'invisible pointer-events-none mt-0 -translate-y-1 opacity-0'
          }`}>
            {DEFINITIONS.slice(PRIMARY_FILTER_COUNT).map(renderDefinition)}
          </div>
          {!activeProfileId ? (
            <p className={`text-xs text-muted-foreground transition-opacity duration-200 motion-reduce:transition-none ${
              showAll ? 'visible mt-2 opacity-100' : 'invisible h-0 opacity-0'
            }`}>
              Select a profile to enable match level, saved, dismissed, analyzed, and Auto-Apply filters.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
