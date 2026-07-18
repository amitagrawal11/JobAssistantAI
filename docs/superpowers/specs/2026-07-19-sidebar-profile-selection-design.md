# Sidebar Profile Selection Design

## Goal

Make profile selection an explicit prerequisite inside the sidebar and ensure Scan stays editable until the selected profile has a real analyzed job.

## Profile stage

The Profile progress step only navigates within the sidebar. It never opens the Dashboard.

The stage loads all backend profiles through `GET /profiles` and renders each profile with its display name and readiness. No profile is implicitly selected merely because profiles exist. The currently selected profile is visually marked.

Selecting a profile writes its ID to `activeProfileId` in extension local storage. A ready profile unlocks Scan. An incomplete profile remains selected but keeps Scan locked and explains what must be completed. The Open Profile button is the only control that opens the Dashboard profile page.

## Workflow state

The selected backend profile is authoritative for the sidebar workflow. Changing profiles clears the locally cached analyzed job and match so results cannot cross candidate boundaries.

Scan editability depends on backend job state, not the legacy mock workflow index:

- No analyzed backend job for the selected profile: fields are editable.
- An analyzed backend job exists and the user revisits Scan: saved inputs are shown read-only.
- Profile is incomplete or absent: Scan is locked.

The existing step indicator continues to allow backward navigation. Clicking Profile displays the selection stage. Forward navigation remains gated by completion.

## Backend and extension boundaries

The backend adds `GET /profiles`, returning profile response objects ordered by most recently updated. The extension adds a profile-list query and a sidebar selector component. Existing `GET /profiles/{profile_id}` remains the detailed active-profile query.

Storage synchronization continues through `browser.storage.onChanged`, so selection updates propagate between Dashboard and sidebar. Job and match storage records remain scoped by `profile_id`.

## Errors and empty states

- No profiles: explain that a profile must be uploaded and show Open Profile.
- Backend unavailable: retain a retry action and do not unlock Scan.
- Incomplete selected profile: show its readiness guidance and Open Profile.
- Profile selection failure: retain the previous selection and show an inline error.

## Verification

Executable smoke coverage will verify profile listing order and contracts. Extension workflow validation will verify that selecting a ready profile unlocks Scan, selecting an incomplete profile keeps it locked, changing profiles clears job/match state, Profile-step navigation stays in the sidebar, and a fresh Scan is editable regardless of an advanced legacy mock checkpoint.
