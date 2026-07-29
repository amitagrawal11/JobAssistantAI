# Job Filter Toolbar Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder Browse Jobs filters by user intent, move sorting beside the results controls, and animate the All filters expansion.

**Architecture:** `JobFilterBar` continues to own filter state and facet menus but exports a small `JobSortControl` for the page-level results toolbar. The filter expansion stays mounted in an overflow-clipped CSS grid so height, opacity, and position can transition without measuring content.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Lock filter hierarchy with component tests

**Files:**
- Modify: `webapp/src/features/job-filters/job-filter-bar.test.tsx`

- [ ] **Step 1: Add a failing collapsed-order test**

Render `JobFilterBar`, read its filter buttons, and assert the first visible sequence is `Skills`, `Role`, `Location`, `Workplace`, `Experience Level`, `Job Type`, `Companies`, `All filters`.

- [ ] **Step 2: Add a failing expanded-order test**

Click `All filters` and assert the complete sequence ends with `Application Method`, `Visa Sponsorship`, `Languages`, `ATS Source`, `Profile Match`, `Previously Handled`.

- [ ] **Step 3: Run the focused test**

Run `npm test -- --run src/features/job-filters/job-filter-bar.test.tsx`.
Expected: both hierarchy tests fail against the current order.

- [ ] **Step 4: Reorder definitions and split primary/secondary groups**

In `job-filter-bar.tsx`, define primary and secondary arrays in the approved order. Render primary definitions unconditionally and secondary definitions only inside the animated expansion.

- [ ] **Step 5: Re-run the focused test**

Expected: hierarchy tests pass without regressing existing menu tests.

### Task 2: Move sorting to the results toolbar

**Files:**
- Modify: `webapp/src/features/job-filters/job-filter-bar.tsx`
- Modify: `webapp/src/pages/browse-jobs.tsx`
- Modify: `webapp/src/features/job-filters/job-filter-bar.test.tsx`

- [ ] **Step 1: Add a failing sort-placement test**

Assert that `JobFilterBar` contains no `Sort results` control. Render `JobSortControl` separately and assert it exposes the current label and available sort choices, excluding `Best Match` without a profile.

- [ ] **Step 2: Run the focused test**

Expected: fail because sorting still lives inside the expanded filter area and no standalone component exists.

- [ ] **Step 3: Export `JobSortControl`**

Implement a compact labeled select using `SORTS`, current sort value, active-profile status, and an `onChange` callback.

- [ ] **Step 4: Place sorting beside selection controls**

In `browse-jobs.tsx`, update the row above cards to contain guidance/select-all actions on the left and `JobSortControl` on the right. Update filters with page reset on sort changes.

- [ ] **Step 5: Re-run the focused test**

Expected: sort tests and all existing filter tests pass.

### Task 3: Animate expanded filters accessibly

**Files:**
- Modify: `webapp/src/features/job-filters/job-filter-bar.tsx`
- Modify: `webapp/src/features/job-filters/job-filter-bar.test.tsx`

- [ ] **Step 1: Add a failing animation-structure test**

Assert the expansion wrapper always exists, uses `grid-rows-[0fr]` while collapsed and `grid-rows-[1fr]` while expanded, includes transition classes, clips overflow, and includes `motion-reduce:transition-none`.

- [ ] **Step 2: Run the focused test**

Expected: fail because the expanded content is conditionally mounted.

- [ ] **Step 3: Implement the transition container**

Always render the outer grid and inner overflow container. Toggle grid-row, opacity, translation, pointer-events, visibility, and `aria-hidden`. Close any secondary dropdown before collapsing.

- [ ] **Step 4: Re-run focused tests**

Expected: all filter component tests pass.

### Task 4: Verify the completed interaction

**Files:**
- Verify: `webapp/src/features/job-filters/job-filter-bar.tsx`
- Verify: `webapp/src/pages/browse-jobs.tsx`

- [ ] **Step 1: Run all frontend tests**

Run `npm test -- --run`. Expected: all tests pass.

- [ ] **Step 2: Run production checks**

Run `npm run build && npm run lint`. Expected: successful build and no new lint failures.

- [ ] **Step 3: Inspect the live page**

Open `http://127.0.0.1:5173/#/jobs`, confirm primary order, expand/collapse transition, secondary order, standalone results sort control, and responsive wrapping.

- [ ] **Step 4: Check the patch**

Run `git diff --check`. Expected: no whitespace errors.
