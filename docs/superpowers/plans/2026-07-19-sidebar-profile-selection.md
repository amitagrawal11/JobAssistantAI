# Sidebar Profile Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** List backend profiles in the sidebar, require explicit selection before Scan, and keep a fresh Scan editable regardless of legacy mock workflow state.

**Architecture:** Add a read-only profile collection endpoint and consume it through TanStack Query. Keep `activeProfileId` as the single cross-surface selection key, scope cached job/match data by profile ID, and derive Scan read-only state exclusively from the presence of a saved backend job.

**Tech Stack:** FastAPI, SQLAlchemy 2, Pydantic v2, React, TypeScript, TanStack Query, Chrome storage, WXT.

---

### Task 1: Add the backend profile collection

**Files:**
- Modify: `backend/scripts/smoke_profiles.py`
- Modify: `backend/app/profiles/service.py`
- Modify: `backend/app/api/profiles.py`

- [x] **Step 1: Extend the profile smoke before implementation**

After creating profiles, call `GET /profiles` and assert the response is an array containing the created profile and ordered by descending `updated_at`.

- [x] **Step 2: Run the smoke and verify RED**

Run: `docker compose exec -T -e DEVELOPMENT_BEARER_TOKEN=change-me-for-local-development api python scripts/smoke_profiles.py`

Expected: FAIL because `/profiles` has no GET collection route.

- [x] **Step 3: Implement the collection**

Add `ProfileService.list()` using `select(Profile).order_by(Profile.updated_at.desc(), Profile.created_at.desc())`. Refresh each profile readiness from its current facts and return full `ProfileResponse` values. Add `GET /profiles` with `response_model=list[ProfileResponse]` before the dynamic `/{profile_id_value}` route.

- [x] **Step 4: Rebuild and verify GREEN**

Run the backend build and `smoke_profiles.py`. Expected: `Validated fictional profile journey`.

### Task 2: Add profile selection state and contract validation

**Files:**
- Modify: `extension/api/profiles.ts`
- Modify: `extension/scripts/validate-active-profile.ts`
- Create: `extension/features/profile/profile-selection.ts`

- [x] **Step 1: Write failing selection validation**

Validate a pure `profileSelectionState(profiles, activeProfileId)` helper: no ID returns no selected profile; a matching ID returns that profile; an absent ID returns no selection; only a ready selected profile unlocks Scan.

- [x] **Step 2: Run validation and verify RED**

Run: `pnpm validate:active-profile`. Expected: TypeScript fails because `profile-selection.ts` does not exist.

- [x] **Step 3: Implement minimal selection helpers and query**

Add `listProfiles()` using `apiRequest('/profiles', z.array(backendProfileSchema))`. Implement the pure helper and a `selectActiveProfile(profileId)` function that writes `activeProfileId`, removes `activeDocumentId`, `activeJobAnalysis`, and `activeBackendMatch`, and increments `activeProfileRevision`.

- [x] **Step 4: Run validation and verify GREEN**

Run: `pnpm validate:active-profile`. Expected: `Validated authoritative backend profile state`.

### Task 3: Render the selector and fix Scan editability

**Files:**
- Create: `extension/features/profile/sidebar-profile-selector.tsx`
- Modify: `extension/entrypoints/sidepanel/App.tsx`
- Modify: `extension/features/job-analysis/scan-view.tsx`
- Modify: `extension/styles/globals.css`
- Modify: `extension/scripts/validate-workflow.ts`

- [x] **Step 1: Add failing workflow assertions**

Extract and validate `isScanReadOnly(savedJob)` so `null` is editable and a saved job is read-only. Validate that Profile step navigation only changes the local step and does not call Dashboard navigation.

- [x] **Step 2: Run validation and verify RED**

Run: `pnpm validate:workflow`. Expected: FAIL because the backend-workflow helper does not exist.

- [x] **Step 3: Implement selector and workflow rules**

Render radio-style profile rows with name, readiness, and selected state. Selecting a row updates storage through `selectActiveProfile`. Profile step navigation calls only `setActiveStep('profile')`. Keep Open Profile as the sole Dashboard navigation control. Compute Scan read-only as `Boolean(backendJob)`, not `activeIndex < canonicalIndex`. Compute step unlocking from backend state: Profile always open, Scan when selected profile is ready, Match when `backendJob` exists, Tailor when `backendMatch` exists.

- [x] **Step 4: Verify extension**

Run all validation scripts, `pnpm exec tsc --noEmit`, and `pnpm build`. Expected: all pass and `.output/chrome-mv3` is produced.

### Task 4: Final verification and commit

**Files:**
- Modify: this plan’s checkboxes

- [x] **Step 1: Run backend and extension regression checks**

Run profile smoke, provider smoke, scoring smoke with `SKIP_LIVE_AI=1`, all extension validations, TypeScript compilation, production build, and `git diff --check`.

- [x] **Step 2: Commit**

```bash
git add backend extension docs
git commit -m "feat: add sidebar profile selection"
```
