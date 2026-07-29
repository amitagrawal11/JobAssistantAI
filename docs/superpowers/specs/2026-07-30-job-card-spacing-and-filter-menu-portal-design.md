# Job Card Spacing and Filter Menu Portal Design

## Goal

Make job-card metadata spacing consistent and ensure filter dropdowns render fully outside the animated filter container.

## Job card layout

Each job card remains an equal-height flex column. The title, company, and location header receives the flexible vertical space. The metadata chip row follows it, and the action footer uses a fixed top margin before its divider.

This moves variable empty space above the chips instead of between the chips and divider. Chips, divider, and footer actions therefore keep consistent spacing across cards while action footers remain aligned.

## Dropdown portal

`FacetMenu` keeps its trigger and interaction state in the filter bar but renders the open menu into `document.body` with `createPortal`.

The menu uses fixed positioning based on the trigger's `getBoundingClientRect()`:

- Prefer opening below the trigger.
- Open above when the available space below is insufficient and more space exists above.
- Align left by default and shift inward when the menu would cross the viewport's right edge.
- Limit menu width to the viewport and menu height to available space.
- Recalculate on open, window resize, and capture-phase scroll.

Outside-click handling treats both the trigger root and portaled menu as inside the component. Clicking another filter closes the previous menu through the existing shared active-menu state.

The portaled menu receives a high stacking layer and is no longer clipped by the advanced filter expansion's `overflow-hidden`.

## Accessibility and behavior

- Existing trigger labels, `aria-expanded`, keyboard focus, checkboxes, Clear, and Done behavior remain unchanged.
- A portaled menu is associated with its trigger through stable identifiers.
- Closing a secondary menu or collapsing advanced filters removes the portal.
- The menu never expands the page's horizontal dimensions.

## Testing

Component tests will verify:

- Card classes put flexible space on the header and fixed spacing on the footer.
- An open filter menu is rendered under `document.body`, not inside the animated panel.
- Trigger geometry produces fixed menu coordinates.
- Outside clicks and switching filters still close the correct portaled menu.
- Existing filter, build, and lint checks remain green.

The Browse Jobs page will be inspected live for consistent chip-to-divider spacing and unclipped primary and secondary dropdowns.
