# Processing Timing and Page Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show shimmer-only, stage-accurate profile processing with measured durations, and make the global breadcrumb the sole page-location label.

**Architecture:** Store stage timing history inside each parse operation's JSON payload, serialize normalized timings in profile responses, and render elapsed/completed durations from shared frontend helpers. Simplify global breadcrumbs and remove only page-level eyebrow labels.

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL JSONB, Pydantic, React, TypeScript, TanStack Query, Vitest.

---

### Task 1: Persist and expose stage timings

**Files:**
- Modify: `backend/app/operations/service.py`
- Modify: `backend/app/documents/service.py`
- Modify: `backend/app/models/profile.py`
- Modify: `backend/app/profiles/service.py`
- Test: `backend/tests/test_profile_processing_lifecycle.py`

- [ ] Add failing tests for reading-to-extracting duration capture.
- [ ] Store ISO start/end timestamps and `duration_ms` for uploading, reading, and extracting in `Operation.payload.stage_timings`.
- [ ] Close the active stage and start the next stage on every transition.
- [ ] Serialize timings through `ProfileProcessing`.
- [ ] Run all backend unit tests.

### Task 2: Render stage timing and shimmer

**Files:**
- Modify: `webapp/src/schemas/backend.ts`
- Modify: `webapp/src/features/profile-processing/profile-processing.ts`
- Modify: `webapp/src/features/profile-processing/profile-processing-card.tsx`
- Modify: `webapp/src/features/profile-processing/profile-processing-card.test.tsx`
- Modify: `webapp/src/index.css`

- [ ] Add failing timing-format and no-spinner tests.
- [ ] Parse the timing contract and format compact elapsed durations.
- [ ] Replace the processing icon and progress fill with shimmer elements.
- [ ] Show the active elapsed time and completed-stage durations.
- [ ] Run focused tests and the production build.

### Task 3: Simplify page hierarchy

**Files:**
- Modify: `webapp/src/App.tsx`
- Modify: `webapp/src/pages/overview.tsx`
- Modify: `webapp/src/pages/browse-jobs.tsx`
- Modify: `webapp/src/pages/documents.tsx`
- Modify: `webapp/src/pages/tailor.tsx`
- Modify: `webapp/src/pages/autoapply.tsx`
- Modify: `webapp/src/pages/applications.tsx`
- Modify: `webapp/src/pages/settings.tsx`
- Test: `webapp/src/pages/page-hierarchy.test.ts`

- [ ] Add a failing source-contract test for removed page eyebrows and `Pathway /`.
- [ ] Render only the current page in normal breadcrumbs.
- [ ] Preserve clickable `Profiles / Profile Name` on profile detail.
- [ ] Remove only top-level blue eyebrow labels.
- [ ] Run frontend tests, build, lint, and live page checks.
