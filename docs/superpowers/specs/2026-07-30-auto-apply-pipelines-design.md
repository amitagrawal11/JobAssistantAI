# Auto-Apply Pipelines Design

## Goal

Turn Browse Jobs selections into a reviewed, durable Auto-Apply pipeline. The first release supports **Start now** only. Date/time scheduling remains a future extension.

## User flow

1. In Apply mode, checking `Auto-apply` only selects a job locally.
2. `Schedule Auto-Apply (N)` becomes available when one or more jobs are selected.
3. Clicking it opens a review dialog listing the selected jobs and active profile. The user can remove mistakes without losing the remaining selection.
4. `Start now` creates and starts the pipeline in one confirmed action, clears the Browse Jobs selection, and opens the Applications page.
5. Applications shows pipeline cards with progress and expandable ordered job rows.

## Data and lifecycle

Add a first-class `auto_apply_pipelines` record with `draft`, `queued`, `running`, `paused`, `completed`, `completed_with_errors`, and `cancelled` states. Each `auto_apply_queue` item belongs to a pipeline, has an explicit position, and may record an error.

Only one pipeline may be active for a profile. Only one item in that pipeline may be in a processing state. A failure is recorded on the item and does not prevent the next pending item from becoming ready.

The current product does not yet contain an external-site submission agent. Therefore Start now advances the first item to `awaiting_approval` and keeps later items queued. Existing approval/submission lifecycle actions release the next item. The UI must never claim an external application was submitted unless the existing submission action records it.

## API

- `POST /auto-apply/pipelines` creates and starts a pipeline from an ordered list of job posting IDs.
- `GET /auto-apply/pipelines?profile_id=...` lists pipelines with their ordered items.
- Existing queue status updates advance the next queued item after the current item reaches `submitted` or `skipped`.
- Duplicate job IDs in one request are rejected. Jobs already present in an unfinished pipeline for the profile are rejected.

## Applications

Applications displays active and recent Auto-Apply pipelines above individually tracked applications. Each pipeline shows its status, `completed / total` progress, creation time, and an expandable ordered item list. Quick Apply and manual applications remain in the existing application table.

## Safety and future scheduling

The review step is mandatory. Creation is transactional: either the pipeline and every item are created or none are. The database stores a nullable `scheduled_at`, but this release always starts immediately and exposes no date/time UI.

