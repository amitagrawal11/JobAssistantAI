# Phase 1 Manual Acceptance Checklist

**Build date:** 2026-07-19  
**Chrome version:** Not recorded
**Reviewer:** Product owner

Use `extension/.output/chrome-mv3`. Rebuild and reload the extension before starting.

## Static checks

| Check | Result | Evidence |
| --- | --- | --- |
| Fictional fixture graph is valid and every referenced fact is verified | Pass | `pnpm validate:fixtures` → `Validated Phase 1 fixtures` |
| Workflow happy path and illegal-transition protection are valid | Pass | `pnpm validate:workflow` → `Validated Phase 1 workflow transitions` |
| Durable changes synchronize between open extension surfaces | Pass | `pnpm validate:sync` → `Validated cross-surface repository synchronization` |
| TypeScript compiles without errors | Pass | `pnpm compile`, 2026-07-19 |
| Production extension builds | Pass | WXT 0.20.27 Chrome MV3 build, 2026-07-19 |
| Manifest contains only Phase 1 permissions | Pass | `Validated manifest permissions: sidePanel, storage` |
| No host permissions or content scripts exist | Pass | `pnpm inspect:manifest` |

## Chrome acceptance gate

Mark each item Pass or Fail and add notes for any failure.

| Requirement | Result | Notes |
| --- | --- | --- |
| Unpacked production extension loads without manifest errors | Pass | |
| Toolbar icon opens the side panel | Pass | |
| Chrome reports that the extension does not need site access | Pass | |
| Side panel remains usable at its narrowest practical width (approximately 360px) | Pass | |
| Scan supports job-text editing and displays 15 mock fields | Pass | |
| Recoverable analysis error preserves text and Retry reaches Match | Pass | |
| Match shows score, hard gates, matched, partial, missing, unknown, and evidence | Pass | |
| Tailor supports change selection and opens document review in Dashboard | Pass | |
| Dashboard resume preview preserves the 210:297 A4 boundary without overflow | Pass | |
| Resume changes show before, after, reason, classification, and verified evidence | Pass | |
| Fill groups entries by confidence and keeps sensitive/unknown answers user-controlled | Pass | |
| Simulated field failure does not stop other approved entries | Pass | |
| Confirm states that the user submits on the portal and exposes no Submit automation | Pass | |
| Dashboard Profile, Documents, Applications, and Settings are reachable | Pass | |
| Profile supports upload/paste presentation and editable fact verification | Pass | |
| Applications filters change visible fictional records | Pass | |
| Settings reusable answers persist and Reset mock data requires confirmation | Pass | |
| Reset mock data updates an already-open side panel without closing it | Pass | |
| Completed/current steps are clickable; incomplete future steps remain disabled | Pass | |
| Keyboard focus is visible across side-panel and Dashboard controls | Pass | |
| Dashboard remains understandable at a 1024px viewport | Pass | |
| Refreshing side panel and Dashboard restores a valid checkpoint | Pass | |
| Browser Network panel shows no application network requests | Pass | Ignore Chrome internal requests; the extension makes none. |

## Recovery checks

1. Edit a verified Profile fact in Dashboard, then refresh the side panel.
2. Confirm the Profile required gate replaces the application journey.
3. Verify every remaining fact to return the profile to Ready, or use Settings → Reset mock data.
4. Navigate to `dashboard.html#not-a-section` and confirm recovery to Profile with an explanation.
5. In DevTools Application → Local Storage, corrupt `job-copilot.phase-1.session`, refresh, and confirm safe seed recovery with an explanation.

## Scope inspection

- No active-page reading.
- No uploaded-file parsing.
- No production match score.
- No AI or backend request.
- No PDF generation.
- No employer-form manipulation.
- No automatic final submission.
- No automated test framework.

## Sign-off

**Final result:** Pass
**Notes:** The product owner completed the full journey, reviewed all Dashboard surfaces, and verified immediate Reset synchronization plus backward-only step navigation on 2026-07-19.
