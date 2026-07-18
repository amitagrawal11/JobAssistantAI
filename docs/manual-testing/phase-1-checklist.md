# Phase 1 Manual Acceptance Checklist

**Build date:** 2026-07-19  
**Chrome version:** Record during final pass  
**Reviewer:** Product owner

Use `extension/.output/chrome-mv3`. Rebuild and reload the extension before starting.

## Static checks

| Check | Result | Evidence |
| --- | --- | --- |
| Fictional fixture graph is valid and every referenced fact is verified | Pass | `pnpm validate:fixtures` → `Validated Phase 1 fixtures` |
| Workflow happy path and illegal-transition protection are valid | Pass | `pnpm validate:workflow` → `Validated Phase 1 workflow transitions` |
| TypeScript compiles without errors | Pass | `pnpm compile`, 2026-07-19 |
| Production extension builds | Pass | WXT 0.20.27 Chrome MV3 build, 2026-07-19 |
| Manifest contains only Phase 1 permissions | Pass | `Validated manifest permissions: sidePanel, storage` |
| No host permissions or content scripts exist | Pass | `pnpm inspect:manifest` |

## Chrome acceptance gate

Mark each item Pass or Fail and add notes for any failure.

| Requirement | Result | Notes |
| --- | --- | --- |
| Unpacked production extension loads without manifest errors | Pending | |
| Toolbar icon opens the side panel | Pending | |
| Chrome reports that the extension does not need site access | Pending | |
| Side panel remains usable at its narrowest practical width (approximately 360px) | Pending | |
| Scan supports job-text editing and displays 15 mock fields | Pending | |
| Recoverable analysis error preserves text and Retry reaches Match | Pending | |
| Match shows score, hard gates, matched, partial, missing, unknown, and evidence | Pending | |
| Tailor supports change selection and opens document review in Dashboard | Pending | |
| Dashboard resume preview preserves the 210:297 A4 boundary without overflow | Pending | |
| Resume changes show before, after, reason, classification, and verified evidence | Pending | |
| Fill groups entries by confidence and keeps sensitive/unknown answers user-controlled | Pending | |
| Simulated field failure does not stop other approved entries | Pending | |
| Confirm states that the user submits on the portal and exposes no Submit automation | Pending | |
| Dashboard Profile, Documents, Applications, and Settings are reachable | Pending | |
| Profile supports upload/paste presentation and editable fact verification | Pending | |
| Applications filters change visible fictional records | Pending | |
| Settings reusable answers persist and Reset mock data requires confirmation | Pending | |
| Keyboard focus is visible across side-panel and Dashboard controls | Pending | |
| Dashboard remains understandable at a 1024px viewport | Pending | |
| Refreshing side panel and Dashboard restores a valid checkpoint | Pending | |
| Browser Network panel shows no application network requests | Pending | Ignore Chrome internal requests; the extension makes none. |

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

**Final result:** Pending product-owner complete click-through  
**Notes:** The initial Scan/Match shell, Dashboard opening behavior, narrow side panel, and no-site-access state were visually reviewed on 2026-07-19. The complete journey requires a reload after the latest build.
