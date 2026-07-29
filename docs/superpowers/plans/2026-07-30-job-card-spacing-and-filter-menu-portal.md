# Job Card Spacing and Filter Menu Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep card chip-to-divider spacing consistent and prevent filter dropdowns from being clipped by the animated advanced-filter container.

**Architecture:** Move card flex growth to the content header so metadata and footer spacing remain fixed. Render `FacetMenu` panels into `document.body` using a React portal and viewport-derived fixed positioning.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Stabilize card metadata spacing

**Files:**
- Modify: `webapp/src/pages/browse-jobs.tsx`
- Create: `webapp/src/pages/browse-jobs.test.tsx`

- [ ] Add a failing source-level regression test asserting the card header owns `flex-1`, the footer does not use `mt-auto`, and the footer uses a fixed top margin.
- [ ] Run the focused test and confirm it fails against the current layout.
- [ ] Add `flex-1` to the header wrapper and replace footer `mt-auto` with `mt-3`.
- [ ] Run the focused test and confirm it passes.

### Task 2: Portal filter dropdowns outside animated overflow

**Files:**
- Modify: `webapp/src/features/job-filters/job-filter-bar.tsx`
- Modify: `webapp/src/features/job-filters/job-filter-bar.test.tsx`

- [ ] Add a failing test asserting an opened secondary menu is a direct child of `document.body` and not a descendant of `advanced-filter-panel`.
- [ ] Extend the geometry test to assert fixed viewport coordinates.
- [ ] Run focused tests and confirm failure because the menu is currently nested and absolutely positioned.
- [ ] Import `createPortal`, add trigger/menu refs, calculate viewport-safe fixed position, and portal the panel into `document.body`.
- [ ] Update outside-click detection to include both refs and recalculate on resize and capture-phase scroll.
- [ ] Run focused tests and confirm existing closing, loading, and alignment behavior remains green.

### Task 3: Full verification

**Files:**
- Verify: `webapp/src/pages/browse-jobs.tsx`
- Verify: `webapp/src/features/job-filters/job-filter-bar.tsx`

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build && npm run lint`.
- [ ] Run `git diff --check`.
- [ ] Inspect primary and secondary dropdowns on `http://127.0.0.1:5173/#/jobs`.
- [ ] Inspect cards with different title and chip counts for consistent chip-to-divider spacing.
