# Integrated Page Header Design

## Goal

Remove the redundant global breadcrumb header, reclaim its vertical space, and
place global utilities beside each page's real title without weakening nested
navigation.

## Shared shell

- Remove the fixed 64px main-area header and its bottom divider.
- Keep the main content panel, rounded outer shell, scrolling behavior, and
  existing horizontal content padding.
- Remove the bottom border from the sidebar brand row because it would no longer
  align with a main header divider.
- Start page content at the top of the main panel with a compact top inset.

## Page header

Create one reusable `PageHeader` component with:

- `title`
- optional `description`
- optional `backLabel` and `onBack`
- optional page-specific actions
- the global profile selector and notification control

The component owns page-title hierarchy and utility placement so individual
pages do not independently reproduce the same layout.

### Top-level pages

For Overview, Profiles management, Browse Jobs, Tailor Assistant, Auto-Apply
Queue, Applications, and Settings:

- Show no breadcrumb.
- Render the title and description on the left.
- Render page-specific actions, profile selection, and notifications on the
  right.

### Nested pages

Use a compact clickable back link above the title only when it provides real
navigation.

Examples:

- `← Profiles` above an individual profile name.
- `← Tailor Assistant` above a tailored-job review.

Do not render `Profiles / EM Profile` followed by another `EM Profile` title.
The current view appears once as the heading; the parent appears once as a back
link.

## Responsive behavior

- On wide screens, the title block and utilities share one row.
- Page-specific actions appear before the profile selector and notification
  control.
- On narrower screens, the header wraps without clipping: the title block takes
  the available width and utilities remain grouped.
- Descriptions wrap below their title and do not push controls outside the
  content panel.

## Profile extraction

The profile selector remains globally visible in every page header. Its existing
processing indicator and dropdown behavior remain unchanged, including the
single-extraction limit.

## Accessibility

- Keep a single `h1` per page view.
- Back navigation is a real button with a descriptive accessible name.
- Keep the notification button label.
- Preserve keyboard access and focus styling for the profile selector and
  utilities.

## Scope

- Do not redesign individual page content, filters, cards, or navigation.
- Do not change profile state, routing, extraction behavior, or notification
  behavior.
- Do not add decorative category labels to replace the removed breadcrumb.

## Verification

- Add source and component tests for the removed global header and shared page
  header behavior.
- Verify top-level pages have no duplicate title.
- Verify profile detail has a parent back link without duplicating its title.
- Run the full frontend test suite, production build, and lint.
- Inspect representative top-level and nested pages in the running application.
