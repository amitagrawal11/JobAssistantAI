# Quick Apply Bulk Selection Design

## Goal

Keep Quick Apply jobs out of the external-site Auto-Apply pipeline while preserving a safe, explicit bulk-application workflow.

## Pipeline Rules

### Apply mode

- Cards show the existing `Auto-apply` checkbox.
- Selecting a card immediately enqueues it in the Auto-Apply queue.
- `Select all` enqueues all visible eligible external-site jobs.
- Individual card actions continue to open the external application flow.

### Quick Apply mode

- Cards show a neutral `Select` checkbox instead of `Auto-apply`.
- Selecting a card only updates local bulk selection; it does not call the Auto-Apply API.
- The toolbar shows `Quick Apply selected` with the selected count.
- The action is disabled when nothing is selected, no profile is active, or a bulk submission is running.
- `Select all` selects only visible Quick Apply jobs.

## Mode Transitions

- Switching between Apply and Quick Apply clears the current selection.
- This prevents a selection created for one pipeline from being submitted to the other.
- The application-method filter remains mutually exclusive.

## Bulk Submission

- Bulk submission uses the existing Quick Apply endpoint once per selected job.
- Requests are processed sequentially to avoid generating a burst of application requests.
- Each successful submission is recorded in Applications with source `quick_apply`.
- Successfully applied jobs enter the existing applied UI state and leave the bulk selection.
- Failed jobs remain selected for retry.
- Bulk failures never open external browser tabs.
- The toolbar reports live progress and a final success/failure summary.

## Error Handling

- One failed job does not stop later selected jobs.
- A complete success reports the total applied.
- A partial result reports both successful and failed counts.
- A complete failure reports the failed count and leaves every job selected.

## Verification

- Tests prove Quick Apply selection never calls `enqueueAutoApply`.
- Tests prove external Auto-Apply selection still enqueues.
- Tests cover mode-change clearing, select-all semantics, sequential bulk progress, success, and partial failure.
- Source/layout tests confirm Quick Apply cards use `Select`, not `Auto-apply`.
- Full tests, build, lint, and live browser checks remain green.
