# Job Card Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an explicit posted date and prioritize up to four candidate-impacting job facts instead of generic card chips.

**Architecture:** Add a pure metadata formatter beside the Browse Jobs feature that converts a `JobPosting` into display descriptors. Keep card markup responsible only for rendering the returned descriptors and the formatted date.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest

---

### Task 1: Metadata prioritization helper

**Files:**
- Create: `webapp/src/features/job-cards/job-card-metadata.ts`
- Create: `webapp/src/features/job-cards/job-card-metadata.test.ts`

- [x] **Step 1: Write failing unit tests**

Cover absolute date formatting, priority order, four-chip cap, sponsorship
labels and tones, salary formatting, English suppression, unknown suppression,
and skill fallback.

- [x] **Step 2: Verify RED**

```bash
cd webapp
npx vitest run src/features/job-cards/job-card-metadata.test.ts
```

Expected: FAIL because the metadata module does not exist.

- [x] **Step 3: Implement the pure helper**

Export `formatPostedDate(job.posted_at)` and `jobCardMetadata(job)`. Return
descriptors shaped as `{ key, label, tone }`, preserve the approved priority,
and return at most four values.

- [x] **Step 4: Verify GREEN**

Run the focused test and expect all helper tests to pass.

### Task 2: Render prioritized metadata

**Files:**
- Modify: `webapp/src/pages/browse-jobs-layout.test.ts`
- Modify: `webapp/src/pages/browse-jobs.tsx`

- [x] **Step 1: Write failing card source contracts**

Require the page to render `formatPostedDate` and `jobCardMetadata`, and reject
the old team and `postedLabel` chip branches.

- [x] **Step 2: Verify RED**

```bash
cd webapp
npx vitest run src/pages/browse-jobs-layout.test.ts
```

Expected: FAIL while the old chips remain.

- [x] **Step 3: Update card rendering**

Render `Posted <date>` below company/location and map the helper descriptors to
semantic chip classes. Preserve the existing flexible card body and divider
spacing.

- [x] **Step 4: Verify GREEN**

Run the card layout and helper tests and expect both to pass.

### Task 3: Full verification

**Files:**
- Verify only

- [x] **Step 1: Run the full suite**

```bash
cd webapp
npm test -- --run
```

- [x] **Step 2: Build**

```bash
cd webapp
npm run build
```

- [x] **Step 3: Lint**

```bash
cd webapp
npm run lint
```

- [x] **Step 4: Inspect a live job card**

Confirm the date is explicit, generic team chips are absent, high-value facts
are prioritized, and the divider spacing remains stable.

### Task 4: Replace generic employment metadata

**Files:**
- Modify: `webapp/src/features/job-cards/job-card-metadata.test.ts`
- Modify: `webapp/src/features/job-cards/job-card-metadata.ts`
- Modify: `webapp/src/features/job-filters/job-filter-bar.test.tsx`
- Modify: `webapp/src/features/job-filters/job-filter-bar.tsx`

- [x] **Step 1: Add failing exact-label and filter-choice tests**

Require normalized `other` employment records to render their meaningful source
commitment and require the Job Type menu to hide the generic `other` option.

- [x] **Step 2: Implement presentation fallbacks**

Use a non-generic source commitment for card metadata, omit the chip when none
exists, and filter `other` from Job Type choices without changing stored values.

- [x] **Step 3: Run focused verification**

Run the card metadata, filter bar, and Browse Jobs layout tests.

### Task 5: Show only positive sponsorship metadata

**Files:**
- Modify: `webapp/src/features/job-cards/job-card-metadata.test.ts`
- Modify: `webapp/src/features/job-cards/job-card-metadata.ts`

- [x] **Step 1: Add a failing negative-state suppression test**

Require unavailable sponsorship and work-authorization-required records to
omit sponsorship metadata and allow more useful card facts to fill the space.

- [x] **Step 2: Keep only confirmed sponsorship**

Render `Visa sponsorship` only when sponsorship is explicitly available.

- [x] **Step 3: Run focused verification**

Run the card metadata tests.
