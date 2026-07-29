# Application Method Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-choice Application Method dropdown with an accessible segmented toggle and give Quick Apply the same outlined treatment as Apply.

**Architecture:** Add a focused `BinaryFacetToggle` presentation component inside the existing filter bar and route only the stable two-value Application Method definition through it. Keep filter state, URL values, API parameters, and all other facet menus unchanged. Update the job-card action class selection so both available actions share one outlined style.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Application Method segmented toggle

**Files:**
- Modify: `webapp/src/features/job-filters/job-filter-bar.test.tsx`
- Modify: `webapp/src/features/job-filters/job-filter-bar.tsx`

- [x] **Step 1: Write failing interaction tests**

Add tests that expand advanced filters, assert `Apply` and `Quick Apply` are
buttons with `aria-pressed`, verify facet counts, select one method, replace it
with the other, and clear it by clicking the active segment. Also assert there
is no Application Method dropdown trigger.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd webapp
npx vitest run src/features/job-filters/job-filter-bar.test.tsx
```

Expected: FAIL because Application Method still renders through `FacetMenu`.

- [x] **Step 3: Implement the binary toggle**

Add `BinaryFacetToggle` with an accessible group label and two pressed buttons.
Map `company_site` to `Apply`, retain `Quick Apply`, show counts when present,
and call `onChange([])` when the active segment is clicked or
`onChange([item.value])` when another segment is clicked. Render this component
only for `applicationMethods`; continue routing every other definition through
`FacetMenu`.

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
cd webapp
npx vitest run src/features/job-filters/job-filter-bar.test.tsx
```

Expected: all filter-bar tests PASS.

### Task 2: Outlined Quick Apply action

**Files:**
- Modify: `webapp/src/pages/browse-jobs-layout.test.ts`
- Modify: `webapp/src/pages/browse-jobs.tsx`

- [x] **Step 1: Write the failing style contract**

Update the source contract test to require a shared outlined action class for
both Apply and Quick Apply and reject the filled-primary Quick Apply class.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd webapp
npx vitest run src/pages/browse-jobs-layout.test.ts
```

Expected: FAIL while the Quick Apply branch still uses a filled primary button.

- [x] **Step 3: Share the outlined available-action style**

Keep the green Applied branch. For every available action, use:

```ts
'border border-primary/45 bg-card text-primary shadow-sm hover:border-primary hover:bg-primary/5'
```

Retain `Zap` for Quick Apply and `ExternalLink` for Apply.

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
cd webapp
npx vitest run src/pages/browse-jobs-layout.test.ts
```

Expected: all job-card layout tests PASS.

### Task 3: Full verification

**Files:**
- Verify only

- [x] **Step 1: Run all frontend tests**

```bash
cd webapp
npm test -- --run
```

Expected: all tests PASS.

- [x] **Step 2: Build the production frontend**

```bash
cd webapp
npm run build
```

Expected: TypeScript and Vite build complete successfully.

- [x] **Step 3: Run lint**

```bash
cd webapp
npm run lint
```

Expected: no errors; existing Fast Refresh warnings may remain.

- [x] **Step 4: Inspect the live Browse Jobs page**

Confirm Application Method appears as `Apply | Quick Apply`, the selected
segment is obvious, clicking it again clears it, and Quick Apply is outlined.

### Task 4: Relocate and animate the method toggle

**Files:**
- Modify: `webapp/src/features/job-filters/job-filter-bar.test.tsx`
- Modify: `webapp/src/features/job-filters/job-filter-bar.tsx`
- Modify: `webapp/src/pages/browse-jobs-layout.test.ts`
- Modify: `webapp/src/pages/browse-jobs.tsx`

- [x] **Step 1: Write failing relocation and motion tests**

Require the filter bar to omit Application Method, require the jobs action row
to render the method control immediately before Sort, reject facet counts in
the segment labels, and require a sliding indicator with 200ms and
reduced-motion classes.

- [x] **Step 2: Run focused tests and verify RED**

```bash
cd webapp
npx vitest run src/features/job-filters/job-filter-bar.test.tsx src/pages/browse-jobs-layout.test.ts
```

Expected: FAIL because the toggle remains inside `JobFilterBar`.

- [x] **Step 3: Export and relocate the toggle**

Export the method toggle as a controlled component. Remove its definition from
the filter bar and render it in a wrapping action group immediately before
`JobSortControl`. Read and write `filters.applicationMethods` through the same
`setFilters` URL flow.

- [x] **Step 4: Add the sliding indicator**

Render one absolute indicator behind stationary labels. Translate it between
the two halves, fade it when nothing is selected, use a 200ms ease-out
transition, and add `motion-reduce:transition-none`.

- [x] **Step 5: Run focused and full verification**

```bash
cd webapp
npx vitest run src/features/job-filters/job-filter-bar.test.tsx src/pages/browse-jobs-layout.test.ts
npm test -- --run
npm run build
npm run lint
```

Expected: all tests and build PASS; lint has no errors.

### Task 5: Strengthen toggle styling and motion

**Files:**
- Modify: `webapp/src/pages/browse-jobs-layout.test.ts`
- Modify: `webapp/src/features/job-filters/job-filter-bar.tsx`

- [x] **Step 1: Add a failing visual source contract**

Require a muted track, white bordered capsule, 260ms pronounced easing, and
reduced-motion support.

- [x] **Step 2: Implement the refined segmented control**

Match the Sort control height, animate one shared capsule between stationary
labels, use primary text only for the selected value, and fade the capsule when
the selection is cleared.

- [x] **Step 3: Run focused verification**

Run the filter-bar and Browse Jobs layout tests.
