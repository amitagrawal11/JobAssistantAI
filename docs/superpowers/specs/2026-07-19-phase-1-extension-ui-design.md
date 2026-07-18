# Phase 1 Extension UI Design

**Status:** Approved design candidate  
**Date:** 2026-07-19  
**Source requirement:** `ATS_APPLICATION_COPILOT_POC_SPEC.md` version 1.1

## Goal

Deliver a loadable Manifest V3 Chrome extension that demonstrates the complete Job Copilot experience using validated mock data. The extension contains a right-side application assistant and a full-page Dashboard. Phase 1 performs no active-page reading, document parsing, real scoring, AI generation, PDF creation, portal filling, or backend communication.

## Product terminology

The full-page extension surface is called the **Dashboard** in product copy and implementation paths. It replaces the generic term “workspace” from the source specification without changing its responsibilities.

- Side panel: the primary Scan → Match → Tailor → Fill → Confirm journey.
- Dashboard: Profile, Documents, Applications, and Settings.

Actions use labels such as “Open Dashboard,” “Review in Dashboard,” and “Set up profile.”

## Delivery approach

Phase 1 uses a foundation-plus-vertical-slices approach:

1. Establish the WXT extension, visual tokens, domain contracts, validated fixtures, repository boundary, and workflow actions.
2. Deliver the persistent side-panel shell and complete Scan slice.
3. Add Match, Tailor, Fill, and Confirm as reviewable vertical slices.
4. Add the Dashboard shell and its Profile, Documents, Applications, and Settings modules.
5. Complete refresh recovery, error states, production build verification, and the manual acceptance pass.

Later-phase directories and capabilities are not created early.

## Architecture

The repository contains one WXT extension package under `extension/` with two React entry points:

- `entrypoints/sidepanel/` renders the narrow application assistant.
- `entrypoints/dashboard/` renders the full-page Dashboard.
- `entrypoints/background.ts` contains only the Phase 1 behavior needed to open or toggle those surfaces.

Both React surfaces consume shared feature modules, product components, Zod contracts, validated mock fixtures, a repository interface, and typed Zustand actions/selectors.

The Phase 1 runtime deliberately excludes a content script, active-page inspection, host permissions, backend client, AI provider, and real form filling.

### Dependency direction

```text
Side panel / Dashboard entry points
                ↓
Feature views and product components
                ↓
Typed Zustand selectors and domain actions
                ↓
Domain contracts and repository interfaces
                ↓
Validated mock fixtures and MockSessionRepository
```

React components cannot write arbitrary workflow states. They invoke named actions such as `editJobDescription`, `analyzeMockJob`, `approveTailoredChange`, `approveFieldMapping`, `simulateFill`, and `markApplicationReady`.

## Visual direction

The interface uses the approved **Calm Professional** direction:

- Cool blue primary actions.
- Neutral canvas and card surfaces.
- Restrained borders and shadows.
- Comfortable spacing and readable typography.
- Strong, visible keyboard focus states.
- Success, warning, danger, and unknown colors used semantically rather than decoratively.
- Slightly denser evidence presentation on Match and Fill screens.

The implementation customizes shadcn/ui source primitives through semantic CSS variables. Default shadcn styling is not treated as the product design system.

The side panel remains usable from approximately 360–480 CSS pixels wide. The Dashboard remains understandable at 1024 pixels. Resume preview pages preserve the 210:297 A4 ratio and visible paper boundaries.

## UI structure

### Side panel

The persistent side-panel shell contains:

1. Product, job, ATS, and readiness context.
2. A visible five-step progress indicator.
3. A scrollable current-step content region.
4. A stable footer with one primary action and, where needed, one secondary action.

The shell supports profile-not-ready, loading, recoverable-error, and unsupported states. Only step content and footer actions change during the journey.

```text
┌──────────────────────────────────────────┐
│ Job Copilot                    [Profile] │
│ Acme · Senior Frontend Engineer          │
│ Greenhouse                     ● Ready   │
├──────────────────────────────────────────┤
│  1 Scan   2 Match   3 Tailor   4 Fill   │
│                              5 Confirm   │
├──────────────────────────────────────────┤
│                                          │
│        CURRENT STEP CONTENT AREA         │
│                                          │
│  Scan                                    │
│  ┌────────────────────────────────────┐  │
│  │ Detected job and application data  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Match                                   │
│  ┌─────────┐  Evidence and gaps          │
│  │   78%   │  remain inspectable         │
│  └─────────┘                             │
│                                          │
│  Tailor / Fill / Confirm replace this    │
│  content without replacing the shell.    │
│                                          │
├──────────────────────────────────────────┤
│ Secondary action      [ Primary action ] │
└──────────────────────────────────────────┘
       approximately 360–480 CSS px
```

When the profile is not ready, the step journey is replaced by a focused setup gate:

```text
┌──────────────────────────────────────────┐
│ Job Copilot                              │
├──────────────────────────────────────────┤
│                                          │
│              Profile required            │
│                                          │
│ Add your resume and verify your facts    │
│ before analyzing or filling a job.       │
│                                          │
│           [ Set up profile ]             │
│                                          │
│       [ Open saved profile ]             │
│                                          │
└──────────────────────────────────────────┘
```

### Dashboard

The Dashboard has persistent navigation for:

- Profile: upload/paste selection, extracted-fact review, edits, and verification.
- Documents: tailored resume changes, A4 preview, and cover-letter review.
- Applications: filterable mock application records and statuses.
- Settings: reusable answers, sensitive-question preferences, and POC data controls.

Heavy review and editing remain in the Dashboard. The side panel presents concise summaries and links into the relevant Dashboard context.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Job Copilot Dashboard                                             Profile ready ●       │
├──────────────────┬─────────────────────────────────────────────────────────────────────┤
│                  │                                                                     │
│  Profile         │  PAGE TITLE                                                         │
│  Documents       │  Supporting description or active application context              │
│  Applications    │                                                                     │
│  Settings        │  ┌───────────────────────────────────────────────────────────────┐  │
│                  │  │                                                               │  │
│                  │  │                    PAGE CONTENT AREA                          │  │
│                  │  │                                                               │  │
│                  │  │  Profile: fact review and verification                       │  │
│                  │  │  Documents: A4 resume and cover-letter review                 │  │
│                  │  │  Applications: tracker and filters                            │  │
│                  │  │  Settings: reusable answers and preferences                   │  │
│                  │  │                                                               │  │
│                  │  └───────────────────────────────────────────────────────────────┘  │
│                  │                                                                     │
├──────────────────┴─────────────────────────────────────────────────────────────────────┤
│ Local mock data · Last saved 14:25                                     Help · About    │
└────────────────────────────────────────────────────────────────────────────────────────┘
                        minimum review viewport: 1024 CSS px
```

The document-review content uses a stable two-region layout inside the Dashboard content area:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Tailored resume · Acme Senior Frontend Engineer          [Download disabled]│
├───────────────────────────────┬──────────────────────────────────────────────┤
│ Changes                       │ Preview                                      │
│                               │                                              │
│ [✓] Reordered skills          │       ┌────────────────────────────┐         │
│ [ ] Leadership rewrite        │       │                            │         │
│ [✓] Project emphasized        │       │        A4 PAGE             │         │
│                               │       │       210 : 297            │         │
│ Before / after / reason       │       │                            │         │
│ Evidence: verified fact IDs   │       └────────────────────────────┘         │
│                               │                                              │
├───────────────────────────────┴──────────────────────────────────────────────┤
│ [Back to side panel]                                  [Approve selected set]│
└──────────────────────────────────────────────────────────────────────────────┘
```

### Shared product components

Product-specific components are composed from curated shadcn/Radix primitives:

- Step indicator.
- Score display.
- Requirement and evidence rows.
- Tailored-change review cards.
- Field-mapping rows.
- Confidence, match-state, and sensitivity badges.
- A4 page preview.
- Empty, loading, unsupported, and recoverable-error states.

No generalized homegrown component framework is introduced.

## Domain data

Phase 1 defines Zod schemas and TypeScript types for:

- Candidate profile and atomic candidate facts.
- Job and application field descriptors.
- Match result and evidence-bearing requirement results.
- Tailored document changes and classifications.
- Fill plan and fill-plan entries.
- Generated resume and cover-letter previews.
- Application records and application events.

Fixtures include one complete fictional candidate, one software-engineering job, one match result, one tailored resume, one cover letter, field mappings spanning every confidence category, and multiple application records. Fixtures contain no real personal data and are validated before entering the store.

## State and persistence

The Zustand store is divided into focused slices:

- `profileSlice`: readiness, fact edits, and verification.
- `jobSlice`: editable job content and match presentation.
- `applicationSlice`: legal workflow transitions, field approval, and fill simulation.
- `documentSlice`: tailored changes, review status, and previews.
- `uiSlice`: current surface navigation and recoverable presentation state.

React components subscribe through focused selectors.

`MockSessionRepository` implements the same repository boundary that Phase 2 will back with Chrome storage and IndexedDB. In Phase 1 it persists only durable checkpoints required for refresh recovery:

- Current legal workflow checkpoint.
- Edited job description.
- Verified and edited facts.
- Accepted or rejected document changes.
- Approved field decisions and user-entered answers.
- Application records and meaningful events.

Loading indicators, expanded rows, dialog visibility, transient errors, and uncommitted input details are not durable.

Invalid workflow transitions return typed errors and retain the last valid checkpoint. Missing, outdated, or invalid persistence data falls back to validated seeded fixtures with a visible recovery explanation. Every route resolves to a valid surface after refresh.

## Interaction behavior

The side panel supports:

- Editing the mock job description.
- Moving through all five assistant steps using legal actions.
- Expanding requirement groups and inspecting evidence.
- Approving or rejecting tailored resume changes.
- Approving individual field mappings.
- Entering missing answers while sensitive answers remain explicit user decisions.
- Opening relevant Dashboard document reviews.
- Simulating independent filled, skipped, failed, and changed-since-scan outcomes.
- Retrying a recoverable mock failure.

The Dashboard supports:

- Switching among all four modules.
- Choosing upload or pasted-text profile setup without parsing a file.
- Editing and verifying mock candidate facts.
- Reviewing accepted and rejected changes.
- Viewing paginated A4 resume and cover-letter previews.
- Viewing and filtering mock applications.

All filling is visibly simulated. The extension never accesses an employer page or presents mock scoring as a production ATS score.

## Error handling

Phase 1 includes explicit, user-triggerable mock paths for:

- Job analysis failure with retry.
- Incomplete profile setup.
- A field changing during simulated fill.
- One field failing without stopping remaining approved entries.
- Invalid persisted data recovery.
- A stale Dashboard route after refresh.

Errors are scoped to the affected operation, preserve earlier approved decisions, explain what happened in plain language, and provide a concrete recovery action when one exists.

## Verification strategy

The source requirement prohibits unit and end-to-end test suites during the initial POC. Phase 1 therefore uses:

- TypeScript type checking.
- WXT production build.
- Dependency and manifest-permission inspection.
- A committed manual acceptance checklist matching the Phase 1 acceptance gate.
- Chrome unpacked-extension validation.
- Visual checks at the narrow side-panel width and 1024-pixel Dashboard viewport.
- Refresh and recovery checks for both surfaces.
- Browser network inspection confirming no application network requests.

The product owner performs the final real-Chrome acceptance pass using exact run and review instructions supplied at handoff.

## Phase boundary

Phase 1 does not include:

- Active-page or DOM access.
- PDF or DOCX parsing.
- Real match scoring.
- AI generation.
- PDF generation.
- Portal field filling.
- Backend or database code.
- Authentication.
- Automated test frameworks.

Phase 1 is complete only after the production build succeeds and every manual acceptance-gate item is recorded as passed or documented with a Phase 1-relevant limitation.
