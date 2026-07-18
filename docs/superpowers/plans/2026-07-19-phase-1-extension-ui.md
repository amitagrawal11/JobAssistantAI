# Phase 1 Extension UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a loadable Manifest V3 Job Copilot Chrome extension whose side panel and Dashboard demonstrate the complete Phase 1 workflow using validated, refresh-safe mock data.

**Architecture:** A single WXT React package exposes separate side-panel and Dashboard entry points. Feature views call typed Zustand domain actions, durable checkpoints pass through a `SessionRepository`, and all fixtures and persisted records cross Zod validation boundaries. Phase 1 contains no content script, host access, backend client, document parser, AI call, real scoring, or portal manipulation.

**Tech Stack:** WXT, React, TypeScript, Zustand, Zod, Tailwind CSS v4, curated shadcn/ui source using Radix primitives, Lucide icons, Chrome Manifest V3 APIs.

**Verification constraint:** The locked POC specification prohibits unit-test and end-to-end-test suites. Each task therefore uses TypeScript checks, WXT builds, targeted browser smoke checks, and a final manual acceptance checklist instead of introducing a test framework.

---

## File map

```text
extension/
├── package.json                       # scripts and locked Phase 1 dependencies
├── pnpm-lock.yaml                     # reproducible dependency graph
├── tsconfig.json                      # WXT-generated TypeScript configuration
├── wxt.config.ts                      # MV3 manifest, side-panel/storage permissions, Vite plugins
├── components.json                    # shadcn source-component configuration
├── entrypoints/
│   ├── background.ts                  # toolbar/side-panel and Dashboard opening only
│   ├── sidepanel/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx
│   └── dashboard/
│       ├── index.html
│       ├── main.tsx
│       └── App.tsx
├── components/
│   ├── ui/                            # owned Button, Card, Badge, inputs, dialog, progress, tabs
│   ├── application/                   # step indicator, field row, application status
│   ├── scoring/                       # score ring, requirement group, evidence row
│   ├── resume/                        # change card and A4 page
│   └── states/                        # empty, loading, error, unsupported
├── features/
│   ├── profile/                       # setup and fact verification views
│   ├── job-analysis/                  # Scan and Match views
│   ├── tailoring/                     # Tailor, resume, and cover-letter views
│   ├── application-fill/              # Fill and Confirm views
│   └── tracking/                      # application list/filter views
├── stores/
│   ├── application-store.ts           # composed store and public actions
│   ├── state.ts                       # store state contract and initial state
│   └── selectors.ts                   # focused subscriptions
├── repositories/
│   ├── session-repository.ts          # durable checkpoint interface
│   └── mock-session-repository.ts     # schema-validated localStorage implementation
├── schemas/                           # Zod domain and persistence contracts
├── mock/                              # fictional validated fixture graph
├── lib/                               # class merge, formatting, IDs, typed result helpers
└── styles/globals.css                 # Tailwind import and Calm Professional tokens
docs/manual-testing/phase-1-checklist.md
README.md
```

## Task 1: Scaffold the WXT extension and visual foundation

**Files:**
- Create: `extension/package.json`
- Create: `extension/pnpm-lock.yaml`
- Create: `extension/tsconfig.json`
- Create: `extension/wxt.config.ts`
- Create: `extension/components.json`
- Create: `extension/entrypoints/background.ts`
- Create: `extension/entrypoints/sidepanel/{index.html,main.tsx,App.tsx}`
- Create: `extension/entrypoints/dashboard/{index.html,main.tsx,App.tsx}`
- Create: `extension/styles/globals.css`
- Create: `extension/lib/cn.ts`

- [ ] **Step 1: Generate the React/TypeScript WXT baseline**

Run from the repository root:

```bash
pnpm dlx wxt@latest init extension --template react
cd extension
pnpm add zustand zod lucide-react clsx tailwind-merge class-variance-authority \
  @radix-ui/react-dialog @radix-ui/react-checkbox @radix-ui/react-radio-group \
  @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-progress
pnpm add -D tailwindcss @tailwindcss/vite
```

Expected: WXT creates a TypeScript React project and pnpm installs without peer-dependency errors. Remove generated popup/demo files rather than retaining unused Phase 1 entry points.

- [ ] **Step 2: Configure the locked manifest boundary**

Set `wxt.config.ts` to the following shape, preserving versions resolved by the scaffold:

```ts
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Job Copilot",
    description: "Review and prepare job applications with user-controlled assistance.",
    permissions: ["sidePanel", "storage"],
    action: { default_title: "Open Job Copilot" },
  },
  vite: () => ({ plugins: [tailwindcss()] }),
});
```

Do not add `activeTab`, `tabs`, `scripting`, host permissions, or a content-script entry point.

- [ ] **Step 3: Add the side-panel and Dashboard roots**

Each `main.tsx` imports `../../styles/globals.css`, creates one React root, and renders its local `App`. Give the Dashboard HTML `<title>Job Copilot Dashboard</title>` and the side panel `<title>Job Copilot</title>`.

Implement `background.ts` so clicking the toolbar enables/opens the side panel for the current window. Dashboard links later use `browser.runtime.getURL("dashboard.html")` and `browser.tabs.create`; no page-reading API is called.

- [ ] **Step 4: Establish Calm Professional semantic tokens**

Start `globals.css` with:

```css
@import "tailwindcss";

:root {
  color-scheme: light;
  --background: #f6f8fb;
  --surface: #ffffff;
  --foreground: #172033;
  --muted: #647087;
  --border: #dfe5ee;
  --primary: #2857d9;
  --primary-foreground: #ffffff;
  --success: #18795b;
  --warning: #a96500;
  --danger: #bd3039;
  --unknown: #667085;
  --focus: #7aa2ff;
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --shadow-card: 0 8px 24px rgb(30 50 80 / 8%);
  --a4-ratio: 210 / 297;
}

* { box-sizing: border-box; }
html, body, #root { min-height: 100%; }
body { margin: 0; background: var(--background); color: var(--foreground); }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
```

- [ ] **Step 5: Verify scaffold and commit**

Run:

```bash
cd extension
pnpm exec tsc --noEmit
pnpm build
```

Expected: both commands exit 0; `.output/chrome-mv3/manifest.json` contains only `sidePanel` and `storage` permissions and no host permissions.

Commit:

```bash
git add extension .gitignore
git commit -m "feat: scaffold phase 1 WXT extension"
```

## Task 2: Define validated domain contracts and fictional fixtures

**Files:**
- Create: `extension/schemas/common.ts`
- Create: `extension/schemas/profile.ts`
- Create: `extension/schemas/job.ts`
- Create: `extension/schemas/match.ts`
- Create: `extension/schemas/document.ts`
- Create: `extension/schemas/fill-plan.ts`
- Create: `extension/schemas/application.ts`
- Create: `extension/schemas/session.ts`
- Create: `extension/schemas/index.ts`
- Create: `extension/mock/candidate.ts`
- Create: `extension/mock/job.ts`
- Create: `extension/mock/match-result.ts`
- Create: `extension/mock/documents.ts`
- Create: `extension/mock/applications.ts`
- Create: `extension/mock/session.ts`

- [ ] **Step 1: Create exact Zod contracts for the Phase 1 graph**

Use string enums matching the locked specification. The shared workflow schema must be:

```ts
export const applicationStatusSchema = z.enum([
  "idle", "job_detected", "analyzing", "scored", "tailoring",
  "reviewing", "ready_to_fill", "filling", "awaiting_submission",
  "completed", "failed",
]);
```

Define atomic `candidateFactSchema` with `id`, `type`, `value`, `confidence` from 0–1, optional source, and `verified`. Define tailored classifications exactly as `REPHRASED`, `REORDERED`, `EMPHASIZED`, `REMOVED`, and `NEW_CLAIM`. Define fill sensitivity and row status enums so High, Medium, Low, Sensitive, and Unknown states cannot collapse into free-form strings.

- [ ] **Step 2: Build one internally connected fixture graph**

Use the fictional candidate `Jordan Lee`, fictional company `Northstar Labs`, and role `Senior Frontend Engineer`. Every match evidence ID and tailored `sourceFactId` must resolve to a candidate fact. Include:

- at least one verified and one unverified fact;
- matched, partial, missing, and unknown requirements;
- accepted, rejected, and pending document changes;
- high, medium, low, sensitive, and unknown fill entries;
- Draft, Ready, Applied, Interview, Offer, Rejected, and Withdrawn applications.

Export only parsed fixtures:

```ts
export const mockSession = sessionSchema.parse({
  schemaVersion: 1,
  workflowStatus: "job_detected",
  profile: mockCandidate,
  job: mockJob,
  matchResult: mockMatchResult,
  documents: mockDocuments,
  fillPlan: mockFillPlan,
  applications: mockApplications,
});
```

- [ ] **Step 3: Add a fixture integrity command without a test framework**

Add `scripts/validate-fixtures.ts` that imports `mockSession`, verifies all referenced fact IDs exist and are verified, and exits nonzero for invalid references. Add `"validate:fixtures": "tsx scripts/validate-fixtures.ts"` and `tsx` as a development dependency.

Run:

```bash
pnpm validate:fixtures
pnpm exec tsc --noEmit
```

Expected: `Validated Phase 1 fixtures` and exit 0.

- [ ] **Step 4: Commit**

```bash
git add extension/schemas extension/mock extension/scripts extension/package.json extension/pnpm-lock.yaml
git commit -m "feat: add validated phase 1 domain fixtures"
```

## Task 3: Add the repository boundary and legal workflow store

**Files:**
- Create: `extension/repositories/session-repository.ts`
- Create: `extension/repositories/mock-session-repository.ts`
- Create: `extension/stores/state.ts`
- Create: `extension/stores/application-store.ts`
- Create: `extension/stores/selectors.ts`
- Create: `extension/lib/result.ts`

- [ ] **Step 1: Define the repository interface**

```ts
export interface SessionRepository {
  load(): Promise<SessionLoadResult>;
  save(checkpoint: PersistedSession): Promise<void>;
  reset(): Promise<PersistedSession>;
}

export type SessionLoadResult =
  | { status: "restored"; session: PersistedSession }
  | { status: "seeded"; session: PersistedSession }
  | { status: "recovered"; session: PersistedSession; reason: string };
```

Implement `MockSessionRepository` using one namespaced `localStorage` key. Parse reads with `persistedSessionSchema.safeParse`; invalid JSON or schema mismatch returns the seeded fixture with `status: "recovered"` rather than throwing.

- [ ] **Step 2: Implement explicit workflow transitions**

Use a transition table rather than component-assigned strings:

```ts
const allowedTransitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  idle: ["job_detected"],
  job_detected: ["analyzing"],
  analyzing: ["scored", "failed"],
  scored: ["tailoring", "job_detected"],
  tailoring: ["reviewing", "failed"],
  reviewing: ["ready_to_fill", "tailoring"],
  ready_to_fill: ["filling", "reviewing"],
  filling: ["awaiting_submission", "failed"],
  awaiting_submission: ["completed", "ready_to_fill"],
  completed: [],
  failed: ["job_detected", "tailoring", "ready_to_fill"],
};
```

`transitionTo` returns a typed failure without mutating state when the edge is illegal.

- [ ] **Step 3: Implement named domain actions and focused selectors**

Required public actions:

```ts
hydrate, resetDemo, editJobDescription, analyzeMockJob, retryLastOperation,
setFactValue, verifyFact, rejectFact, approveTailoredChange,
rejectTailoredChange, approveFieldEntry, setFieldAnswer,
simulateFill, markApplicationReady, setDashboardSection, setApplicationFilter
```

Persist only after durable decisions. Do not persist expanded groups, dialogs, loading state, or transient errors. Export selectors such as `selectCurrentStep`, `selectMatchSummary`, `selectApprovedFillEntries`, and `selectProfileReadiness`.

- [ ] **Step 4: Add and run a transition probe**

Create `scripts/validate-workflow.ts` that initializes the store with the in-memory repository, walks the happy path, attempts one illegal transition, and verifies the illegal transition preserves the last valid status.

Run:

```bash
pnpm validate:workflow
pnpm exec tsc --noEmit
```

Expected: `Validated Phase 1 workflow transitions` and exit 0.

- [ ] **Step 5: Commit**

```bash
git add extension/repositories extension/stores extension/lib extension/scripts extension/package.json
git commit -m "feat: add refresh-safe phase 1 workflow store"
```

## Task 4: Build curated primitives and persistent shells

**Files:**
- Create: `extension/components/ui/{button,card,badge,input,textarea,checkbox,select,dialog,progress,tabs}.tsx`
- Create: `extension/components/application/step-indicator.tsx`
- Create: `extension/components/states/{empty-state,loading-state,error-state,unsupported-state}.tsx`
- Create: `extension/features/shared/open-dashboard.ts`
- Modify: `extension/entrypoints/sidepanel/App.tsx`
- Modify: `extension/entrypoints/dashboard/App.tsx`

- [ ] **Step 1: Add only the curated source primitives**

Implement accessible wrappers around native controls and the installed Radix packages. Every interactive primitive accepts `className`, forwards refs, preserves native disabled semantics, and uses `cn()` for class composition. Do not install a second component suite.

- [ ] **Step 2: Implement the persistent side-panel shell**

The root uses `min-width: 360px`, a three-row grid (`auto minmax(0,1fr) auto`), a scrollable content region, and the specification’s stable header, step indicator, and footer. The current step derives from workflow status; steps are not arbitrary navigation buttons when their prerequisites are incomplete.

- [ ] **Step 3: Implement the Dashboard shell**

Use a responsive two-column layout at desktop width with persistent Profile, Documents, Applications, and Settings navigation. Restore the selected valid section after hydration; unknown hashes/routes fall back to Profile and display a one-time recovery notice.

- [ ] **Step 4: Verify keyboard and viewport behavior**

Run `pnpm dev`, load the generated extension, and check:

- toolbar icon opens the side panel;
- Tab reaches every header and footer action with a visible focus ring;
- side panel is usable at 360px;
- Dashboard remains readable at 1024px;
- “Open Dashboard” opens `dashboard.html` in an extension tab.

- [ ] **Step 5: Commit**

```bash
git add extension/components extension/features/shared extension/entrypoints extension/styles
git commit -m "feat: add side panel and Dashboard shells"
```

## Task 5: Implement the Scan and Match vertical slices

**Files:**
- Create: `extension/features/job-analysis/scan-view.tsx`
- Create: `extension/features/job-analysis/match-view.tsx`
- Create: `extension/components/scoring/{score-ring,requirement-group,evidence-row}.tsx`
- Modify: `extension/entrypoints/sidepanel/App.tsx`

- [ ] **Step 1: Build Scan with authoritative editable mock text**

Show the detected fictional job, ATS, description, and 15-field count. Job text editing commits through `editJobDescription`; “Analyze job” calls `analyzeMockJob`. Label the result as mock data and include Paste text instead and Rescan controls without accessing the active tab.

- [ ] **Step 2: Build explainable Match**

Render the overall score, hard gates, matched, partial, missing, and unknown groups. Expanded rows show requirement text, candidate evidence, score contribution, and classification reason. Use semantic colors plus text/icons so color is never the sole signal.

- [ ] **Step 3: Add retryable mock analysis failure**

Expose a “Simulate recoverable error” secondary action in demo-only UI. It transitions through `analyzing` to `failed`, retains the edited description, and renders Retry. Retry returns to the successful scored checkpoint.

- [ ] **Step 4: Verify and commit**

Run `pnpm exec tsc --noEmit && pnpm build`. Manually edit the job, exercise failure/retry, expand every match group, and refresh Match to confirm restoration.

```bash
git add extension/features/job-analysis extension/components/scoring extension/entrypoints/sidepanel
git commit -m "feat: add mock Scan and Match journey"
```

## Task 6: Implement tailoring and document review

**Files:**
- Create: `extension/features/tailoring/tailor-view.tsx`
- Create: `extension/features/tailoring/resume-review.tsx`
- Create: `extension/features/tailoring/cover-letter-review.tsx`
- Create: `extension/components/resume/{change-card,a4-page}.tsx`
- Create: `extension/features/dashboard/documents-page.tsx`
- Modify: `extension/entrypoints/sidepanel/App.tsx`
- Modify: `extension/entrypoints/dashboard/App.tsx`

- [ ] **Step 1: Build the side-panel Tailor summary**

Show resume page count, change count, cover-letter word count, and compact proposed-change controls. Every change displays its classification and verified evidence count. Disable approval for `NEW_CLAIM` and explain the rejection rule.

- [ ] **Step 2: Build Dashboard resume review**

Use the approved two-region layout: scrollable changes on the left and paginated A4 preview on the right. Each change shows before, after, reason, classification, and source facts. Accept/reject actions update both summary and preview.

- [ ] **Step 3: Build cover-letter review**

Render a readable letter preview with linked supporting facts and mock-only download-disabled messaging. Do not create a PDF blob or network request.

- [ ] **Step 4: Verify and commit**

At 1024px confirm the A4 page stays within its container and keeps the 210:297 ratio. Approve/reject changes, refresh both surfaces, and confirm identical decisions.

```bash
git add extension/features/tailoring extension/features/dashboard/documents-page.tsx extension/components/resume extension/entrypoints
git commit -m "feat: add tailored document review experience"
```

## Task 7: Implement Fill and Confirm

**Files:**
- Create: `extension/features/application-fill/fill-view.tsx`
- Create: `extension/features/application-fill/confirm-view.tsx`
- Create: `extension/components/application/{field-mapping-row,confidence-badge,readiness-summary}.tsx`
- Modify: `extension/entrypoints/sidepanel/App.tsx`

- [ ] **Step 1: Render fill-plan groups by behavior**

Group entries into Ready to fill, Review answer, and Your input required. High confidence entries are preselected; medium entries require confirmation; low, sensitive, and unknown entries are not selected. Every row exposes value, source, confidence, sensitivity, and review status.

- [ ] **Step 2: Support review and explicit answers**

Medium answers become eligible only after confirmation. Sensitive answers require direct input or Skip and never derive from a fact. The overwrite checkbox remains off and is visibly mock-only.

- [ ] **Step 3: Simulate independent fill outcomes**

`simulateFill` operates only on approved entries. Seed at least one changed-since-scan and one failed outcome; continue all remaining entries. Update rows to Filled, Skipped, Failed, or Changed since scan and retain the immutable approved snapshot used by the simulation.

- [ ] **Step 4: Build Confirm**

Show completed fields, selected mock documents, outstanding questions, and the explicit instruction that the extension will not submit. “Mark as ready” creates an application event but never represents a portal submission.

- [ ] **Step 5: Verify and commit**

Confirm sensitive and unknown entries remain empty, a single failed row does not stop the run, and no Submit action exists. Refresh after fill and confirm the outcome persists.

```bash
git add extension/features/application-fill extension/components/application extension/entrypoints/sidepanel
git commit -m "feat: add approved-fill simulation and confirmation"
```

## Task 8: Complete Dashboard Profile, Applications, and Settings

**Files:**
- Create: `extension/features/dashboard/profile-page.tsx`
- Create: `extension/features/profile/{profile-setup,fact-review,fact-card}.tsx`
- Create: `extension/features/dashboard/applications-page.tsx`
- Create: `extension/features/tracking/{application-table,application-filters}.tsx`
- Create: `extension/features/dashboard/settings-page.tsx`
- Modify: `extension/entrypoints/dashboard/App.tsx`

- [ ] **Step 1: Build Profile setup and fact verification**

Provide Upload and Paste modes. Capture a selected PDF/DOCX filename without reading bytes and state that parsing arrives with backend connection. Allow Markdown/plain-text paste, fact edits, Verify, Reject, Save draft, and Finish review. Unverified facts never appear as tailoring evidence.

- [ ] **Step 2: Build Applications tracking**

Render company, role, ATS, status, score, applied date, and source URL for the fictional records. Add All, Active, Applied, and Closed filters and accessible status badges covering all specified statuses.

- [ ] **Step 3: Build Settings**

Support mock reusable answers and sensitive-question preferences. Data export/delete controls open confirmation dialogs and explain that Phase 1 affects local mock state only; reset uses `resetDemo`.

- [ ] **Step 4: Verify and commit**

Navigate every Dashboard section with keyboard only, edit and verify a fact, filter applications, change a reusable answer, refresh, and confirm durable decisions remain.

```bash
git add extension/features/profile extension/features/tracking extension/features/dashboard extension/entrypoints/dashboard
git commit -m "feat: complete phase 1 Dashboard modules"
```

## Task 9: Harden hydration, recovery, and phase boundaries

**Files:**
- Modify: `extension/repositories/mock-session-repository.ts`
- Modify: `extension/stores/application-store.ts`
- Modify: `extension/entrypoints/sidepanel/App.tsx`
- Modify: `extension/entrypoints/dashboard/App.tsx`
- Create: `extension/components/application/profile-required.tsx`
- Create: `extension/scripts/inspect-manifest.ts`
- Modify: `extension/package.json`

- [ ] **Step 1: Add hydration gates to both entry points**

Render a skeleton during hydration. On `seeded`, show the default Scan state. On `restored`, render the checkpoint. On `recovered`, render the valid seeded session plus a dismissible explanation. Never render a partially hydrated workflow.

- [ ] **Step 2: Add the Profile-required gate**

When readiness is incomplete, replace the five-step content with the approved setup gate. “Set up profile” opens the Dashboard Profile page; “Open saved profile” is available only when a draft exists.

- [ ] **Step 3: Enforce the manifest and network boundary mechanically**

Implement `inspect-manifest.ts` to read `.output/chrome-mv3/manifest.json`, fail if permissions include `activeTab`, `tabs`, `scripting`, or `debugger`, fail on host permissions or content scripts, and print the allowed permission set. Add `"inspect:manifest": "tsx scripts/inspect-manifest.ts"`.

- [ ] **Step 4: Run the complete static verification**

```bash
cd extension
pnpm validate:fixtures
pnpm validate:workflow
pnpm exec tsc --noEmit
pnpm build
pnpm inspect:manifest
```

Expected: every command exits 0 and inspection reports only `sidePanel` and `storage`.

- [ ] **Step 5: Commit**

```bash
git add extension
git commit -m "feat: harden phase 1 recovery and boundaries"
```

## Task 10: Document, manually accept, and hand off Phase 1

**Files:**
- Create: `docs/manual-testing/phase-1-checklist.md`
- Create: `README.md`
- Modify only if checks expose defects: relevant `extension/` files

- [ ] **Step 1: Write exact run instructions**

Document:

```bash
cd extension
pnpm install
pnpm dev
```

For production loading, document `pnpm build` and loading the absolute repository path `extension/.output/chrome-mv3` through `chrome://extensions` → Developer mode → Load unpacked.

- [ ] **Step 2: Create the acceptance checklist**

Mirror all twelve Phase 1 acceptance-gate bullets. Add columns for Pass/Fail, Chrome version, date, and notes. Include explicit subchecks for 360px side panel, 1024px Dashboard, A4 overflow, keyboard focus, refresh recovery, approve/reject visibility, error retry, zero application network requests, manifest permissions, and absence of later-phase directories.

- [ ] **Step 3: Perform local automated checks**

Run:

```bash
cd extension
pnpm validate:fixtures
pnpm validate:workflow
pnpm exec tsc --noEmit
pnpm build
pnpm inspect:manifest
git diff --check
```

Record the exact outputs and date in the checklist. Do not mark Chrome-only checks passed without observing them.

- [ ] **Step 4: Product-owner Chrome pass**

Ask the product owner to load `extension/.output/chrome-mv3` and complete the Chrome-only checklist. Supply precise reproduction steps for any failure, fix only Phase 1 defects, rebuild, and repeat affected checks.

- [ ] **Step 5: Final scope audit**

Run:

```bash
find extension -maxdepth 3 -type f | sort
rg -n "fetch\(|axios|activeTab|scripting|host_permissions|content_scripts" extension \
  -g '!pnpm-lock.yaml' -g '!.output/**'
git status --short
```

Expected: no backend, adapter, content-script, parser, AI, PDF-generation, or page-fill implementation; no unexplained working-tree changes.

- [ ] **Step 6: Commit documentation and produce the required handoff**

```bash
git add README.md docs/manual-testing/phase-1-checklist.md extension
git commit -m "docs: add phase 1 runbook and acceptance record"
```

Handoff using the exact required structure:

```text
Phase completed:

Implemented:
- ...

Files changed:
- ...

Run instructions:
1. ...

Manual checks performed:
- ...

Known limitations deferred to next phase:
- ...
```

Do not describe Phase 2 or Phase 3 exclusions as Phase 1 defects.

## Plan self-review record

- All Phase 1 scope sections and acceptance-gate items map to tasks above.
- The plan creates no later-phase directory or capability.
- Type names, statuses, public actions, and repository method names are consistent across tasks.
- Static validation scripts protect fixture references, workflow transitions, and manifest boundaries without introducing a prohibited test framework.
- The Dashboard rename is used in product copy and implementation paths.
