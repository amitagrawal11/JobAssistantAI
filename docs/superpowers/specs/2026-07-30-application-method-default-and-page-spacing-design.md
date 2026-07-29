# Application Method Default and Page Spacing Design

## Goal

Make the application-method control visually consistent and impossible to leave in an ambiguous unselected state, while tightening the shared main-area spacing.

## Application Method State

- `Apply` is the default application method.
- Exactly one of `Apply` and `Quick Apply` is always selected.
- Selecting the inactive option replaces the current selection.
- Clicking the active option leaves it selected.
- The implicit default is represented by an empty URL parameter set so existing clean Browse Jobs URLs remain clean.
- Parsing a URL without `application_method` produces `company_site`.
- Resetting all filters restores `company_site`.

## Segmented Control

- Keep the two-option segmented control because both mutually exclusive outcomes remain explicit.
- Use a fully rounded pill for the outer boundary.
- Use a fully rounded pill for the animated active indicator.
- Keep the sliding indicator animation and reduced-motion fallback.
- Preserve the existing count-free labels: `Apply` and `Quick Apply`.
- Expose each segment as an `aria-pressed` button inside the labelled application-method group.

## Shared Main-Area Spacing

- Change the routed page viewport to 16px top and bottom padding.
- Change the routed page viewport to 24px left and right padding.
- Keep the existing fixed-shell and page-owned scrolling behavior unchanged.
- Apply the spacing through the single shared route wrapper so every page remains aligned.

## Verification

- State tests prove a missing URL method resolves to `company_site` while serialization omits that implicit default.
- Component tests prove Apply is selected for an empty input, active segments cannot be cleared, and inactive segments replace the selection.
- Source/layout tests prove both the outer control and indicator use pill radii.
- Shell tests prove the shared wrapper uses `px-6 py-4`.
- The complete test, build, and lint suites continue to pass.
- Browser verification confirms the pill geometry, visible default, sliding selection, and updated page inset.
