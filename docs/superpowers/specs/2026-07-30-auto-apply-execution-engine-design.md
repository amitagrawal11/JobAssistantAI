# Auto-Apply Execution Engine Design

## Goal

Turn the existing ordered Auto-Apply pipeline into a durable serial executor that attempts supported applications, records every stage and attempt, and stops safely when human action is required.

## Recommended model

Use a hybrid adapter-based executor:

- **Automatic mode** submits only through an explicitly supported adapter. Lever uses the existing tested multipart submission client.
- **Review mode** prepares one item and waits for explicit approval.
- Unsupported vendors, CAPTCHA, login, custom questions, missing resume/contact data, and rejected requests become **blocked** items with a clear reason and application URL. They are never reported as submitted.

The queue remains strictly serial: only the first non-terminal item can run. A terminal submitted or skipped item releases the next item. A blocked item pauses that pipeline until the user retries or skips it.

## Item stages

The database enum remains the coarse lifecycle for compatibility. Detailed stage and attempt history live in `queue_metadata`.

```text
queued
  -> preparing
  -> validating_profile
  -> loading_resume
  -> filling
  -> submitting
  -> submitted

Any executable stage
  -> retry_wait (transient failure)
  -> blocked (human action required)
  -> failed (attempt limit reached)
  -> skipped
```

Every transition appends an immutable event containing timestamp, stage, message, attempt number, and optional error code. The current stage, attempt count, last error, and application URL are returned in the API.

## Pipeline controls

- Pause: finish no additional items until resumed.
- Resume: return a paused pipeline to running.
- Cancel: mark the pipeline cancelled and leave submitted items intact.
- Retry item: clear a blocked/retryable error and return the item to queued.
- Skip item: mark it skipped and release the next item.

## Execution

A background loop wakes every two seconds and claims at most one runnable item per active pipeline. Database row locking prevents two API processes from executing the same item. Each attempt commits its starting state before making an external request, then commits the result.

Submission adapters return one of:

- `submitted`: verified successful submission;
- `blocked`: human action required with a reason and URL;
- `retryable`: temporary network/provider problem;
- `failed`: permanent validation/rejection.

No generic headless-browser form filler is included in this release. Blindly clicking arbitrary employer pages is unreliable and unsafe. Additional ATS vendors can be added behind the same adapter contract after their forms and success signals are tested.

## UI

The Auto-Apply Queue becomes the operational view:

- active pipeline progress and controls;
- one “Currently processing” card;
- ordered items with stage, attempt count, last event, and timestamps;
- expandable event timeline;
- Retry, Skip, and Open application actions for blocked items;
- clear distinction between Submitted, Blocked, Failed, and Queued.

Applications continues showing pipeline summaries, while Auto-Apply provides detailed execution telemetry.

## Safety invariants

- Never create a tracked application until an adapter returns verified success.
- Never mark a CAPTCHA/login/custom-question flow as submitted.
- Never execute more than one item per pipeline at a time.
- Never retry permanent rejection automatically.
- Maximum three attempts with bounded retry delay.
- Cancelling a pipeline never deletes history.
