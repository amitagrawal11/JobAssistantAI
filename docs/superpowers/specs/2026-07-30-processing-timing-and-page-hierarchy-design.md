# Processing Timing and Page Hierarchy Design

Date: 2026-07-30

## Processing presentation

- Processing cards use shimmer placeholders and an indeterminate shimmer track.
- No rotating spinner appears on a processing card.
- The visible lifecycle follows the persisted backend stage: Uploading resume,
  Reading resume, Extracting profile, Ready, or Failed.
- The current stage shows elapsed time.
- Completed stages show their measured duration.
- Uploading, reading, and extracting start/end timestamps and durations remain
  stored with the backend operation for diagnostics.
- Percentages are not shown because progress is not genuinely measurable.

## Breadcrumb and page hierarchy

- Remove `Pathway /` from the global breadcrumb.
- A normal page shows only its current section name.
- Profile detail retains `Profiles / Profile Name`; Profiles remains clickable.
- Remove duplicate top-level blue eyebrow labels from Overview, Browse Jobs,
  Profiles, profile creation/processing, Tailor Assistant, Auto-Apply Queue,
  Applications, and Settings.
- Preserve uppercase labels inside cards, tables, forms, and data groupings.

## Verification

- Confirm reading changes to extracting during a real operation.
- Confirm each stage exposes measured timing.
- Confirm processing cards contain no spinner and respect reduced motion.
- Confirm every primary page has one location label in the global header.
