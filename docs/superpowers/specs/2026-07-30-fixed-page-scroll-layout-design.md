# Fixed Page Scroll Layout Design

## Goal

Give every main-area page a consistent 24px inset and prevent the application shell itself from scrolling. Page-level navigation and controls should remain visible while the page's primary content region scrolls independently.

## Shared Page Frame

- The application shell keeps the sidebar and main panel fixed to the viewport.
- The routed page viewport uses 24px padding on all four sides.
- Every route renders inside a full-height, `min-height: 0` flex column.
- The shared page header is a non-scrolling, shrink-resistant region.
- A reusable scroll-area primitive owns vertical overflow below the header.
- Nested scrolling is avoided except for intentionally bounded controls such as dropdown lists and document previews.

## Browse Jobs

The Browse Jobs page uses five vertical regions:

1. Fixed page header with title, description, profile selector, and notifications.
2. Fixed search and filter controls.
3. Fixed selection, application-method, and sorting toolbar.
4. Flexible results region containing the job-card grid.
5. Fixed pagination below the results region.

Only the results region scrolls. Loading, error, and empty states render inside the same flexible region so layout does not jump between states. Filters that expand or collapse reduce or increase the available results height without moving controls into the scroll container.

## Other Pages

Overview, Profiles, Applications, Auto-Apply Queue, Tailor Assistant, and Settings share the same rule:

- The page header stays fixed.
- The primary page content below it owns vertical scrolling.
- A page-specific toolbar that controls a long list may remain fixed with the header, while the list or table body scrolls.
- Existing bounded preview panes may continue to scroll internally where their UI depends on independent document navigation.

This keeps the global shell stationary without forcing every page to use an identical internal composition.

## Overview

- Rename `Your job search at a glance` to `Overview`.
- Do not restore the removed Dashboard/profile selector. Profile selection remains available through the shared header control.

## Nested Page Navigation

Nested views place an icon-only back button directly before the page title on the same row.

- Profile detail displays `[back arrow] Amit Agrawal`.
- The visible breadcrumb label such as `Profiles` is removed.
- The button retains an accessible label and tooltip such as `Back to Profiles`.
- Other nested views, including Tailor review, use the same treatment.

## Responsive Behavior

- Header actions may wrap when horizontal space is constrained.
- The content scroll area recalculates from the remaining height after wrapping.
- The 24px inset remains consistent at supported desktop widths.
- Dropdowns and popovers continue to render above scroll containers and must not resize the page.

## Accessibility

- The back control is a semantic button with an explicit accessible name.
- Keyboard focus remains visible for all fixed controls and scrollable results.
- The isolated results region remains reachable with normal keyboard navigation.
- No content is hidden solely because the shell no longer scrolls.

## Verification

- Component tests cover the inline icon-only back action.
- Integration/source tests cover the Overview title, removed redundant selector, fixed shell overflow, 24px padding, and shared page layout primitives.
- Browse Jobs tests confirm that the result grid owns scrolling while pagination remains outside it.
- Existing test, build, and lint suites continue to pass.
- Browser verification confirms that the shell does not scroll, the job grid does, fixed controls do not move, and profile detail renders the arrow beside the title.
