# Auto-Apply Pipelines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create reviewed Start-now Auto-Apply pipelines that process one job at a time and remain visible on Applications.

**Architecture:** Add pipeline persistence around the existing queue items and make terminal item transitions release the next item. Browse Jobs keeps selection client-side until confirmation; Applications reads a nested pipeline API.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, PostgreSQL, React, TypeScript, TanStack Query, Zod, Vitest.

---

### Task 1: Pipeline domain and persistence

**Files:**
- Create: `backend/migrations/versions/0015_add_auto_apply_pipelines.py`
- Modify: `backend/app/db/entities.py`
- Modify: `backend/app/models/auto_apply.py`
- Test: `backend/tests/test_auto_apply_pipeline.py`

- [ ] Write failing service tests for ordered pipeline creation, duplicate rejection, and single active pipeline validation.
- [ ] Run `cd backend && pytest tests/test_auto_apply_pipeline.py -q` and confirm the missing pipeline API fails.
- [ ] Add pipeline enums/entities, queue-item pipeline fields, request/response models, and migration.
- [ ] Run the focused backend test and confirm it passes.

### Task 2: Pipeline service and API

**Files:**
- Modify: `backend/app/autoapply/service.py`
- Modify: `backend/app/api/auto_apply.py`
- Test: `backend/tests/test_auto_apply_pipeline.py`

- [ ] Write failing tests that Start now releases only the first item and a terminal item releases exactly one successor.
- [ ] Run the focused test and confirm the lifecycle assertions fail.
- [ ] Implement transactional create/list and serial advancement.
- [ ] Run the focused test and backend suite.

### Task 3: Web API contract

**Files:**
- Modify: `webapp/src/schemas/auto-apply.ts`
- Modify: `webapp/src/api/auto-apply.ts`
- Create: `webapp/src/features/auto-apply/auto-apply-pipeline.test.ts`
- Create: `webapp/src/features/auto-apply/auto-apply-pipeline.ts`

- [ ] Write failing tests for selection review removal and request ordering helpers.
- [ ] Run the focused Vitest file and confirm it fails.
- [ ] Add pipeline schemas, API calls, and pure review helpers.
- [ ] Run the focused test and confirm it passes.

### Task 4: Browse Jobs review and Start now

**Files:**
- Modify: `webapp/src/pages/browse-jobs.tsx`
- Modify: `webapp/src/pages/browse-jobs-layout.test.ts`

- [ ] Add failing source/behavior assertions for local-only selection, the counted schedule button, mandatory review dialog, and Start now.
- [ ] Run the focused test and confirm it fails.
- [ ] Remove eager enqueue calls and implement the review dialog plus pipeline mutation/navigation.
- [ ] Run focused and full web tests.

### Task 5: Applications pipeline presentation

**Files:**
- Modify: `webapp/src/pages/applications.tsx`
- Create: `webapp/src/pages/applications-pipelines.test.ts`

- [ ] Write failing assertions for pipeline query, progress, and expandable items.
- [ ] Run the focused test and confirm it fails.
- [ ] Add pipeline cards above direct applications with loading/error/empty states.
- [ ] Run focused and full web tests.

### Task 6: Verification

**Files:**
- No production changes expected.

- [ ] Run backend tests and migration checks.
- [ ] Run web tests, lint, and production build.
- [ ] Verify in the browser that selection is local, review can remove a job, Start now creates one pipeline, and Applications shows ordered progress.
