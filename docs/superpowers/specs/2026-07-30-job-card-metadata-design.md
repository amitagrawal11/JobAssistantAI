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
3. Confirmed visa sponsorship.
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
- `unavailable`, `work_authorization_required`, and unknown sponsorship states
  are omitted from cards because they are common rather than differentiating.
- Non-English languages use `<Language> required`.
- Workplace, employment, experience, travel, and degree values use concise
  title-cased labels.
- When normalized employment type is `other`, use a meaningful source
  `commitment` such as `Permanent` or `Short Term`.
- If normalized employment type is `other` and no meaningful commitment
  exists, omit the employment chip.
- Salary uses the available currency, range, and period without inventing
  missing values.

## Filter behavior

- Do not expose `other` as a selectable Job Type option.
- Preserve the stored normalized value for API compatibility; this is a
  presentation correction rather than a data migration.

## Visual treatment

- Match uses the existing soft primary treatment.
- Visa sponsorship uses a soft green treatment.
- Other facts remain neutral.
- Keep the existing chip spacing and fixed divider spacing.

## Architecture

Create a focused job-card metadata helper that formats the posting date and
returns a maximum of four display descriptors. The Browse Jobs page maps those
descriptors to chips, keeping prioritization and formatting out of the card
markup.

## Testing

- Unit-test priority, the four-chip cap, unknown suppression, English
  suppression, exact commitment fallback, sponsorship labels, salary
  formatting, and explicit date formatting.
- Update the card layout source contract to reject team and relative-date chip
  rendering.
- Run the complete frontend test suite, production build, and lint.
