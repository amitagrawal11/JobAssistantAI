# Application Method Toggle Design

## Goal

Make the two application methods faster to understand and select, while giving
manual Apply and Quick Apply actions the same restrained visual weight on job
cards.

## Filter interaction

- Replace the Application Method dropdown with a two-segment toggle displayed
  in the advanced filter row.
- Label the existing `company_site` value as **Apply**.
- Label `quick_apply` as **Quick Apply**.
- The segments are mutually exclusive because selecting both methods is
  equivalent to applying no method filter.
- Clicking an unselected segment selects it and clears the other segment.
- Clicking the selected segment clears the application-method filter.
- Show each facet count inside its segment when the API supplies a count.
- The control must expose pressed state and an Application Method group label
  for assistive technology.
- The URL and API contract continue using `company_site` and `quick_apply`;
  this is a presentation and interaction change, not a data migration.

## Other binary filters

Application Method is the only current filter with exactly two stable semantic
options. Other fixed filters have at least three options, while dynamic facets
may happen to contain two values for a particular result set. Dynamic result
counts must not change a filter's control type, so all other filters remain
dropdowns.

## Job-card actions

- Manual **Apply** remains an outlined blue button with the external-link icon.
- **Quick Apply** changes from filled blue to the same outlined blue treatment,
  retaining the lightning icon.
- The in-progress **Applying…** state remains disabled.
- The completed **Applied** state remains green so completion is visibly
  distinct from an available action.

## Testing

- Component tests verify that Application Method renders as two toggle buttons
  rather than a dropdown.
- Tests verify select, replace, and clear interactions.
- Tests verify that API facet counts appear in the segments.
- The job-card source contract test verifies that both available actions use
  the outlined treatment and that no filled-primary Quick Apply style remains.
- Run the full frontend test suite, production build, and lint after the focused
  tests pass.
