# Non-Blocking Profile Extraction Design

Date: 2026-07-30

## Objective

Allow profile creation and resume extraction to continue in the background without
blocking navigation, losing progress on refresh, or changing the user's active
ready profile.

## Product Decisions

- The previously selected ready profile remains active while a new profile is
  processed.
- Completing a new profile never switches away from an existing ready active
  profile automatically.
- If this is the user's first profile, no active profile exists during
  processing. On success it becomes the default and active profile automatically.
- The user may navigate anywhere while processing continues.
- After submitting profile creation, the user remains on the current creation
  screen unless they deliberately navigate elsewhere.
- The current product permits one active profile extraction at a time.
- The lifecycle and data model must support independent per-profile operations so
  concurrent extraction can later be enabled for premium customers without a
  redesign.
- Global progress uses the integrated profile-selector treatment: the active
  profile remains the primary label, with a compact status indicator beside it.

## Lifecycle

The normalized profile-processing lifecycle is:

1. `uploading`: the resume file is being transferred and persisted.
2. `reading`: Docling is parsing the PDF or DOCX and understanding its document
   structure. The internal backend stage may be named `parsing`, but UI copy must
   say "Reading resume".
3. `extracting`: experience, skills, education, and other profile facts are being
   produced and validated.
4. `ready`: the profile is complete enough to become selectable and usable.
5. `failed`: processing stopped and the user may retry or delete the profile.

Progress is indeterminate unless the backend can report genuine measurable
progress. The UI must not display invented percentages.

## Architecture

### Backend ownership

Extraction state must be persisted in the existing backend operation model.
The current browser-memory parsing set is not authoritative because it is lost
on refresh, browser restart, or remount.

The backend owns operation execution after upload. The browser starts the
operation and observes it; a long-lived browser request must not be responsible
for completing the work.

Each profile-list record exposes a normalized latest extraction summary containing:

- operation identifier;
- operation status;
- user-facing processing stage;
- start and completion timestamps;
- safe failure category;
- retry eligibility.

The persisted operation stage is updated at the boundaries between reading and
extraction. Uploading is represented by the newly created profile before its
source document is complete.

The backend enforces the one-active-extraction entitlement atomically. This
prevents two tabs from starting separate operations simultaneously. Failed and
completed operations do not occupy the extraction slot.

An in-app route change does not cancel an active upload. A full browser refresh
or shutdown may interrupt the file transfer because the browser cannot recover
the local file automatically. In that case, the persisted profile transitions
to an "upload interrupted" failure and asks the user to select the file again;
it must not remain permanently in `uploading`.

### Frontend observation

A shared operation-status query supplies both the global profile selector and
Profiles page. It polls only while a non-terminal operation exists and stops
after all observed operations become `ready` or `failed`.

On terminal success, the profile list, completed profile, readiness, and other
profile-dependent queries are invalidated. Refreshing or reopening the app
reconstructs the current state from backend data.

## Creation-Screen Behavior

Submitting "Create profile & extract" transitions the creation form in place to
a processing view. It shows:

- profile name;
- uploaded filename;
- current stage;
- indeterminate activity indicator;
- reassurance that the user can safely continue using Pathway.

The app does not automatically redirect to the Profiles page or another page.

If processing completes while the user remains on this screen, the screen
transitions directly to the completed profile. If the user deliberately
navigates away, processing continues in the background. Refreshing the creation
screen restores the same processing view from backend state.

## Global Header and Dropdown

The header continues to display the active ready profile. While another profile
is processing, the selector also displays an amber status dot and
"1 processing".

Opening the selector shows:

- the active ready profile with its existing selected/default treatment;
- the processing profile with "Uploading", "Reading resume", or
  "Extracting profile";
- a link to manage profiles.

The processing profile cannot be selected for Browse Jobs, matching, Quick
Apply, Auto-Apply, tailoring, or other profile-dependent operations.

When no ready profile exists yet, the header shows the processing profile as
status-only rather than selected. Profile-dependent actions remain unavailable
until processing succeeds.

On completion, the processing indicator becomes a temporary green
"Profile ready" acknowledgement. The active profile remains unchanged and the
new profile becomes manually selectable.

On failure, the header shows a restrained red dot and "Profile needs attention".
Selecting that status opens profile management focused on the failed card.

## Profiles Page

An in-progress profile appears immediately as an amber-tinted card containing:

- profile name and filename;
- stage label and status icon;
- animated indeterminate progress;
- "Safe to leave this page" reassurance.

Rename, delete, default selection, and opening incomplete profile details are
disabled while processing. The "New profile" card remains visible but disabled
with "One profile is already being prepared."

When processing succeeds, the card changes to the normal ready state.

When processing fails, the card changes to a restrained error state with:

- a concise safe error message;
- "Try again";
- "Delete".

Retry reuses the existing uploaded document and creates a new operation rather
than duplicating the profile.

## Failure and Recovery

Backend logs retain technical parser, provider, and model errors. User-facing
messages use safe categories such as:

- resume could not be read;
- extraction could not be completed;
- processing was interrupted.

A running operation maintains a backend heartbeat. If no heartbeat is observed
for 15 minutes, it is transitioned to an interrupted failure. It then releases
the current single-extraction slot and becomes retryable. The same 15-minute
rule applies to an incomplete upload record.

Deleting a failed profile removes its associated documents and operations under
the existing profile deletion contract.

## Accessibility and Motion

- Status is communicated with icon and text in addition to color.
- Header status changes use a polite live region.
- Focus order includes processing and failure entries in the selector.
- Disabled actions explain why they are unavailable.
- Indeterminate animation respects reduced-motion preferences.

## Verification

Automated and live verification must cover:

- remaining on the creation screen after submission;
- navigating away during upload, reading, and extraction;
- refreshing or reopening during processing;
- restoring the creation processing view after refresh;
- keeping the previous ready profile active;
- excluding incomplete profiles from profile-dependent actions;
- enforcing one active extraction across multiple tabs;
- profile-card and header-status consistency;
- successful completion without automatic profile switching;
- parsing failure, extraction failure, retry, and deletion;
- stale-operation recovery;
- accessible announcements and reduced-motion behavior;
- the ability to remove the concurrency restriction later without changing the
  operation or UI status model.

## Out of Scope

- Enabling concurrent extraction for premium customers.
- Automatically switching to a newly completed profile.
- Using partially extracted profile data.
- Reporting artificial percentage completion.
