# Backend Profile Propagation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the backend profile authoritative across Dashboard and side panel, with Profile as a locked prerequisite to the existing workflow.

**Architecture:** A shared profile-state module maps stored active identifiers plus a React Query result into explicit UI states. A shared hook observes Chrome storage and supplies this state to both extension entrypoints; the backend profile is never copied into Zustand. Existing job and downstream workflow data remains mocked and is labeled accordingly.

**Tech Stack:** TypeScript, React 19, TanStack Query, Chrome Extension Storage API, Zustand UI/workflow state, WXT.

---

### Task 1: Define and validate authoritative profile state

**Files:**
- Create: `extension/features/profile/active-profile-state.ts`
- Create: `extension/scripts/validate-active-profile.ts`
- Modify: `extension/package.json`

- [x] **Step 1: Write the failing executable validation**

Create cases that call `deriveActiveProfileState` with missing identifiers, loading, backend error, `needs_review`, and `ready` profiles. Assert that only backend readiness `ready` unlocks Scan and that error/missing states never do.

- [x] **Step 2: Run validation and confirm the missing-module failure**

Run: `pnpm --dir extension validate:active-profile`

Expected: failure because `active-profile-state.ts` does not exist.

- [x] **Step 3: Implement the minimal state mapper**

Export this discriminated union and pure mapper:

```ts
export type ActiveProfileState =
  | { status: 'missing'; scanUnlocked: false }
  | { status: 'loading'; scanUnlocked: false }
  | { status: 'error'; scanUnlocked: false; message: string }
  | { status: 'available'; scanUnlocked: boolean; profile: BackendProfile };

export function deriveActiveProfileState(input: {
  profileId: string | null;
  pending: boolean;
  profile?: BackendProfile;
  error?: Error | null;
}): ActiveProfileState;
```

For an available profile, set `scanUnlocked` only when `profile.readiness === 'ready'`.

- [x] **Step 4: Run validation**

Run: `pnpm --dir extension validate:active-profile`

Expected: `Validated authoritative backend profile state`.

### Task 2: Add the shared active-profile hook and six-stage sidebar

**Files:**
- Create: `extension/features/profile/use-active-backend-profile.ts`
- Modify: `extension/components/application/step-indicator.tsx`
- Modify: `extension/components/application/profile-required.tsx`
- Modify: `extension/entrypoints/sidepanel/App.tsx`
- Modify: `extension/entrypoints/dashboard/App.tsx`
- Modify: `extension/features/dashboard/profile-page.tsx`
- Modify: `extension/features/profile/source-preview.tsx`

- [x] **Step 1: Implement identifier observation and query sharing**

The hook reads `activeProfileId` and `activeDocumentId`, subscribes to `browser.storage.onChanged`, and calls `useQuery` with `profileQueryKey(profileId)`. Disable the query when no identifier exists. Return `deriveActiveProfileState(...)` plus identifiers and `refetch`.

- [x] **Step 2: Share upload and mutation updates**

After upload, let the storage event update consumers. Keep `queryClient.setQueryData(profileQueryKey(profileId), profile)` after fact mutations so Dashboard and side panel receive readiness changes through their QueryClient instances; also persist a lightweight `activeProfileRevision` timestamp after mutation so storage events trigger refetches in other extension documents.

- [x] **Step 3: Expand the step indicator**

Change the sequence to `Profile, Scan, Match, Tailor, Fill, Confirm`. Profile is always enabled. When profile is incomplete, every later button is disabled. Once ready, Scan is enabled and later stages use the existing workflow-derived maximum. Clicking Profile invokes `openDashboard('profile')`.

- [x] **Step 4: Replace sidebar mock readiness**

Remove `state.profile.verification.status` from the side panel. Render Profile as the active prerequisite for missing/loading/error/incomplete states. Show a targeted explanation and Dashboard action. For an available ready profile, show the backend display name and verified-fact count, then enable Scan.

- [x] **Step 5: Replace the Dashboard hard-coded status**

Render `No profile`, `Profile needs review`, `Profile ready`, or `Backend unavailable` from the shared hook. Add a retry action for the error state. Do not display a fictional fallback.

- [x] **Step 6: Compile and validate**

Run:

```bash
pnpm --dir extension validate:active-profile
pnpm --dir extension compile
```

Expected: validation message and zero TypeScript errors.

### Task 3: Label remaining mocks and complete verification

**Files:**
- Create: `extension/components/states/mock-data-notice.tsx`
- Modify: `extension/features/job-analysis/scan-view.tsx`
- Modify: `extension/features/dashboard/documents-page.tsx`
- Modify: `extension/features/dashboard/applications-page.tsx`
- Modify: `extension/features/dashboard/settings-page.tsx`
- Modify: `extension/styles/globals.css`
- Modify: `docs/superpowers/plans/2026-07-19-phase-2-backend-intelligence.md`

- [x] **Step 1: Add a reusable mock-data notice**

Create a compact notice with a `FlaskConical` icon, a required `children` label, and `role="note"`. Use it on Scan and the still-mocked Dashboard pages without changing their workflow behavior.

- [x] **Step 2: Add six-column and status styles**

Update `.step-indicator` to six columns. Add styles for profile-state copy, retry controls, verified-fact metadata, and the mock-data notice. Preserve the 360px side-panel layout.

- [x] **Step 3: Run the complete executable verification set**

Run:

```bash
pnpm --dir extension validate:active-profile
pnpm --dir extension validate:workflow
pnpm --dir extension validate:sync
pnpm --dir extension compile
pnpm --dir extension build
git diff --check
```

Expected: all validation messages, successful WXT production build, and no whitespace errors.

- [x] **Step 4: Record manual acceptance status**

Mark Task 6 manual verification complete only after confirming Profile locks Scan until backend readiness is ready, readiness propagates without closing the side panel, refresh preserves the active profile, and the remaining mocks are labeled.

- [x] **Step 5: Commit**

```bash
git add backend extension docs/superpowers/plans/2026-07-19-phase-2-backend-intelligence.md docs/superpowers/plans/2026-07-19-backend-profile-propagation.md
git commit -m "feat: propagate backend profile across extension"
```
