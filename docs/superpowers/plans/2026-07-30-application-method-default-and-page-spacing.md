# Application Method Default and Page Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Apply the permanent default application method, render the two choices as a consistently pill-shaped animated control, and change shared page spacing to 16px vertically by 24px horizontally.

**Architecture:** Normalize the default in the URL-state layer so every consumer receives exactly one application method. Keep `company_site` implicit during serialization to avoid adding noise to default URLs. Make the segmented control replace selections rather than toggle them off, and adjust spacing only in the shared route wrapper.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest, Testing Library

---

### Task 1: Application method state invariant

**Files:**
- Modify: `webapp/src/features/job-filters/job-filter-state.ts`
- Modify: `webapp/src/features/job-filters/job-filter-state.test.ts`

- [ ] **Step 1: Write failing state tests**

Add:

```ts
it('defaults application method to company site', () => {
  expect(parseJobFilterSearch('').applicationMethods).toEqual(['company_site']);
});

it('keeps the default application method implicit when serializing', () => {
  expect(serializeJobFilterSearch(DEFAULT_JOB_FILTERS)).toBe('');
  expect(serializeJobFilterSearch({
    ...DEFAULT_JOB_FILTERS,
    applicationMethods: ['quick_apply'],
  })).toBe('application_method=quick_apply');
});
```

Update the invalid-value test to compare against the normalized default containing `applicationMethods: ['company_site']`.

- [ ] **Step 2: Run the state tests and verify failure**

Run:

```bash
cd webapp && npm test -- src/features/job-filters/job-filter-state.test.ts
```

Expected: FAIL because the current default method is an empty array and default serialization does not special-case `company_site`.

- [ ] **Step 3: Implement the normalized default**

Change the default:

```ts
applicationMethods: ['company_site'],
```

After parsing repeated values, restore the default when no valid application method remains:

```ts
if (next.applicationMethods.length === 0) {
  next.applicationMethods = ['company_site'];
}
```

Skip the implicit default in serialization:

```ts
for (const [param, key] of Object.entries(REPEATED)) {
  const values = state[key] as string[];
  if (
    key === 'applicationMethods'
    && values.length === 1
    && values[0] === 'company_site'
  ) continue;
  for (const value of values) {
    if (value.trim()) params.append(param, value.trim());
  }
}
```

- [ ] **Step 4: Run the state tests and verify success**

Run:

```bash
cd webapp && npm test -- src/features/job-filters/job-filter-state.test.ts
```

Expected: PASS.

### Task 2: Non-clearable pill segmented control

**Files:**
- Modify: `webapp/src/features/job-filters/job-filter-bar.tsx`
- Modify: `webapp/src/features/job-filters/job-filter-bar.test.tsx`
- Modify: `webapp/src/pages/browse-jobs-layout.test.ts`

- [ ] **Step 1: Write failing interaction and styling tests**

Render with an empty value and require the fallback default:

```tsx
const onChange = vi.fn();
render(<ApplicationMethodToggle values={[]} onChange={onChange} />);

const apply = screen.getByRole('button', { name: 'Apply' });
expect(apply.getAttribute('aria-pressed')).toBe('true');
fireEvent.click(apply);
expect(onChange).not.toHaveBeenCalled();

fireEvent.click(screen.getByRole('button', { name: 'Quick Apply' }));
expect(onChange).toHaveBeenLastCalledWith(['quick_apply']);
```

Rerender with Quick Apply selected, click it, and assert that it is not cleared. In the source-level layout test, require `rounded-full` on the outer group, active indicator, and buttons.

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```bash
cd webapp && npm test -- src/features/job-filters/job-filter-bar.test.tsx src/pages/browse-jobs-layout.test.ts
```

Expected: FAIL because the active option currently emits an empty array and the control uses `rounded-xl`/`rounded-lg`.

- [ ] **Step 3: Implement selection replacement and pill geometry**

Normalize locally for defensive rendering:

```ts
const selected = values[0] ?? 'company_site';
```

Use:

```tsx
className="relative grid h-9 shrink-0 grid-cols-2 rounded-full border border-border/70 bg-muted/70 p-1"
```

Make the indicator and buttons `rounded-full`. Replace the click handler with:

```tsx
onClick={() => {
  if (!pressed) onChange([item.value]);
}}
```

Determine `pressed` from `selected === item.value`.

- [ ] **Step 4: Run focused tests and verify success**

Run:

```bash
cd webapp && npm test -- src/features/job-filters/job-filter-bar.test.tsx src/pages/browse-jobs-layout.test.ts
```

Expected: PASS.

### Task 3: Shared page inset and complete verification

**Files:**
- Modify: `webapp/src/App.tsx`
- Modify: `webapp/src/app-profile-navigation.test.ts`

- [ ] **Step 1: Write the failing shell spacing assertion**

Replace the previous `p-6` expectation with:

```ts
expect(appSource).toContain(
  'className="min-h-0 flex-1 overflow-hidden px-6 py-4"',
);
expect(appSource).not.toContain(
  'className="min-h-0 flex-1 overflow-hidden p-6"',
);
```

- [ ] **Step 2: Run the shell test and verify failure**

Run:

```bash
cd webapp && npm test -- src/app-profile-navigation.test.ts
```

Expected: FAIL because the shared route wrapper still uses 24px on all sides.

- [ ] **Step 3: Apply the shared inset**

Change the route wrapper to:

```tsx
<div className="min-h-0 flex-1 overflow-hidden px-6 py-4">
```

- [ ] **Step 4: Run all tests**

Run:

```bash
cd webapp && npm test
```

Expected: all tests pass.

- [ ] **Step 5: Run build and lint**

Run:

```bash
cd webapp && npm run build
cd webapp && npm run lint
```

Expected: build succeeds and lint reports no errors; existing Fast Refresh warnings may remain.

- [ ] **Step 6: Verify in the browser**

Confirm:

- Apply is visibly selected on a clean Browse Jobs URL.
- Clicking Apply does not deselect it.
- Quick Apply becomes selected with a sliding indicator.
- The outer boundary, indicator, and segments are fully pill-shaped.
- The route wrapper computes to `16px 24px` padding.
- Existing fixed-shell and isolated job-results scrolling remain intact.
