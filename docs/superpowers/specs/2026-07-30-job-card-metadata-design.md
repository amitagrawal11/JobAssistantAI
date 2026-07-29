# Job Card Metadata Design

## Goal

Replace generic job-card chips with compact candidate-impacting facts and show
an explicit posting date.

## Posting date

- Display an absolute date below the company and location using
  `Posted Jul 29, 2026`.
- Do not represent the posting date as a relative chip such as `Today` or
  `4 days ago`.
- Omit the date line when `posted_at` is unavailable.

## Chip selection

Render at most four chips. Select available, meaningful values in this order:

1. Profile match score.
2. Salary range.
3. Sponsorship or work-authorization constraint.
4. Non-English required language.
5. Workplace type.
6. Employment type.
7. Experience level.
8. Travel requirement.
9. Explicit degree requirement.
10. Up to two detected skills when capacity remains.

Do not display team, role category, industry, relative posting time, `unknown`,
`none_mentioned`, or English as chips. Do not add a generic overflow chip.

## Labels

- `available` sponsorship becomes `Visa sponsorship`.
- `unavailable` becomes `No sponsorship`.
- `work_authorization_required` becomes `Work authorization required`.
- Non-English languages use `<Language> required`.
- Workplace, employment, experience, travel, and degree values use concise
  title-cased labels.
- Salary uses the available currency, range, and period without inventing
  missing values.

## Visual treatment

- Match uses the existing soft primary treatment.
- Visa sponsorship uses a soft green treatment.
- No sponsorship and work-authorization requirements use a soft amber
  treatment.
- Other facts remain neutral.
- Keep the existing chip spacing and fixed divider spacing.

## Architecture

Create a focused job-card metadata helper that formats the posting date and
returns a maximum of four display descriptors. The Browse Jobs page maps those
descriptors to chips, keeping prioritization and formatting out of the card
markup.

## Testing

- Unit-test priority, the four-chip cap, unknown suppression, English
  suppression, sponsorship labels, salary formatting, and explicit date
  formatting.
- Update the card layout source contract to reject team and relative-date chip
  rendering.
- Run the complete frontend test suite, production build, and lint.
