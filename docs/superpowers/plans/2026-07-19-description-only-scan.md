# Description-Only Job Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Scan’s metadata form with one required job-description input and make Job Analyst derive all metadata.

**Architecture:** Tighten the Pydantic request contract to `profile_id + description`, remove user-provided metadata fallbacks from the analysis service, and reduce the React form/request type to one textarea. Preserve the response shape and stored extracted metadata.

**Tech Stack:** FastAPI, Pydantic v2, React, TypeScript, TanStack Query, WXT.

---

### Task 1: Lock the description-only backend contract

**Files:**
- Create: `backend/scripts/smoke_job_contract.py`
- Modify: `backend/app/models/job.py`
- Modify: `backend/app/jobs/service.py`
- Modify: `backend/scripts/smoke_scoring.py`
- Modify: `shared/examples/jobs/senior-frontend-engineer.json`

- [x] Add a failing smoke asserting `JobAnalyzeRequest` accepts trimmed `profile_id + description`, rejects descriptions shorter than 20 characters, and rejects title/company/location/source URL extras.
- [x] Run it in the container and observe RED because title is currently required.
- [x] Remove metadata fields, forbid extra request keys, and use only analyst-extracted metadata in persistence and response.
- [x] Reduce the shared job fixture and live scoring request to description-only, then rebuild and observe GREEN.

### Task 2: Reduce the Scan UI to one input

**Files:**
- Create: `extension/features/job-analysis/scan-contract.ts`
- Modify: `extension/scripts/validate-workflow.ts`
- Modify: `extension/api/jobs.ts`
- Modify: `extension/features/job-analysis/scan-view.tsx`
- Modify: `extension/styles/globals.css`

- [x] Add failing validation for `canAnalyzeDescription`: whitespace and fewer than 20 trimmed characters are false; 20 or more are true.
- [x] Run `pnpm validate:workflow` and observe RED because the helper is absent.
- [x] Implement the helper, description-only request type, and textarea-only form. Restore saved descriptions read-only and enable Analyze solely from trimmed length.
- [x] Run workflow validation, TypeScript compilation, and production build and observe GREEN.

### Task 3: Verify and commit

- [x] Run backend contract/profile/provider/scoring smokes, all extension validations, TypeScript compilation, production build, and `git diff --check`.
- [ ] Commit with `feat: simplify job scan input`.
