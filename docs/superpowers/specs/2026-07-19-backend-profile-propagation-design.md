# Backend Profile Propagation Design

## Objective

Make the active backend profile the authoritative candidate-profile source across the Dashboard and side panel. Eliminate fictional profile readiness and candidate evidence from those shared surfaces while leaving job analysis, tailoring, generated documents, and application tracking explicitly mocked until their planned backend integrations are implemented.

## Scope

This change covers active-profile discovery, backend-profile loading, cross-surface synchronization, readiness presentation, and candidate-profile gates. It does not implement provider selection, job analysis, matching, tailoring, document generation, or application persistence.

## Architecture

Create a shared `useActiveBackendProfile` hook backed by Chrome local storage and TanStack Query. Chrome storage contains only the active profile and document identifiers. The backend remains authoritative for profile facts, fact verification, source-comparison completion, and readiness.

The hook returns a discriminated state covering loading, missing profile, available profile, and recoverable backend failure. Dashboard and side-panel consumers render from this state rather than reading `state.profile` from the Phase 1 Zustand store.

Zustand remains responsible for temporary UI and the still-mocked job workflow. The existing fictional profile may remain in the Phase 1 checkpoint temporarily for schema compatibility, but it must no longer determine profile readiness or provide candidate evidence to shared profile-aware surfaces.

## Data Flow

1. Resume upload creates or reuses a backend profile and stores `activeProfileId` and `activeDocumentId` in `browser.storage.local`.
2. The shared hook observes those keys and fetches `GET /profiles/{profile_id}` through the existing API client.
3. Fact verification updates the shared React Query cache and invalidates the profile query when required.
4. `browser.storage.onChanged` updates every open extension surface when the active identifiers change.
5. Dashboard header and side panel derive readiness from the backend profile response.

No backend profile is copied into Zustand, preventing competing persisted representations.

## User Interface Behavior

The Dashboard header displays one of: no profile, profile needs review, profile ready, or backend unavailable. It must not show a hard-coded ready state.

The side panel permits the job workflow only when backend readiness is `ready`. Before that, it shows a profile gate linking to the Dashboard and explains whether the user must upload, verify facts, or complete source comparison.

Once ready, the side panel shows the real candidate display name and verified-fact count near the Profile link. The currently mocked job scan remains available but is visibly labeled as mock until Task 8 replaces it.

Dashboard pages that still use fictional job, document, or application data display a compact mock-data notice. They do not present fictional candidate identity as though it came from the uploaded resume.

## Error Handling

Missing active identifiers are an expected empty state. A stale or deleted profile produces a recoverable profile-required state and offers a route to upload again. Backend timeout or unavailability produces a retry action and never falls back to fictional readiness.

Profile query failures do not erase the stored identifiers automatically, allowing recovery after the backend restarts.

## Verification

Executable extension validation will cover active-profile state mapping and readiness gating without adding a formal test framework. TypeScript compilation and production builds must pass.

Manual acceptance checks:

- Uploading a resume updates the Dashboard header and side panel without closing either surface.
- A profile remains gated until all facts are verified and source comparison is complete.
- Readiness changes propagate immediately across open extension surfaces.
- Backend unavailability shows a retryable state and no fictional readiness.
- Job scan and downstream mock pages are clearly identified as mocks.
- Refreshing either surface preserves the active backend profile.

## Out of Scope

- Converting backend facts into the Phase 1 `CandidateProfile` schema.
- Running AI matching or tailoring.
- Generating production documents.
- Replacing the application tracker.
- Removing all Phase 1 mock schemas before their owning tasks are implemented.
