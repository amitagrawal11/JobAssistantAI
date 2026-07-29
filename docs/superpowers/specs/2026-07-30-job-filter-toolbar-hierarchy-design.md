# Job Filter Toolbar Hierarchy Design

## Goal

Improve Browse Jobs filtering by placing the highest-intent controls first, separating sorting from filtering, and making the expanded filter area feel smooth and deliberate.

## Filter order

The collapsed filter row shows:

1. Skills
2. Role
3. Location
4. Workplace
5. Experience Level
6. Job Type
7. Companies
8. All filters

This order starts with candidate intent and qualification, then narrows by geography and work arrangement, and ends with broader organizational criteria.

Expanding **All filters** reveals:

1. Application Method
2. Visa Sponsorship
3. Languages
4. ATS Source
5. Profile Match
6. Previously Handled

Selected values remain visible in their filter buttons. Candidate-aware filters remain disabled when no profile is selected.

## Sort placement

Sorting is not rendered inside the filter expansion. A dedicated results toolbar appears below the filter card and above the job cards:

- The left side contains the existing selection guidance and Select all action.
- The right side contains a compact **Sort: Newest** control.
- Its menu offers Newest, Oldest, Company Ascending, Company Descending, and Best Match when a profile is active.

This keeps sorting next to the content it reorders and ensures it remains visible whether filters are collapsed or expanded.

## Expansion animation

The additional filter row stays mounted inside a CSS grid container that transitions between zero and one fractional row. Its inner content also transitions opacity and vertical position.

- Opening: height expands while content fades and slides in.
- Closing: content fades and slides out while height collapses.
- Overflow is clipped during the transition.
- Reduced-motion preferences disable movement and use an immediate state change.
- Dropdown menus close when their filter becomes hidden.

## Component changes

- `JobFilterBar` owns filter ordering, the animated expansion, and filter actions.
- The Browse Jobs page owns the results-toolbar placement because it already owns selection guidance, Select all, result count, and job cards.
- A compact sort control receives the current sort, available profile state, and change callback through the filter-bar interface or a small exported component.

No API or database changes are required.

## Testing

Component tests will verify:

- The collapsed filter buttons appear in the specified order.
- Expanded-only filters are not interactable while collapsed and appear in the specified order after expansion.
- Sort is absent from the expandable filter area and visible in the results toolbar.
- The expansion container has the transition and reduced-motion behavior.
- Existing selected-value, dropdown-closing, loading, focus, and overflow behavior remains intact.

Production build, lint, frontend tests, and live browser inspection will verify the final result.
