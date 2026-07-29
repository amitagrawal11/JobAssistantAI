# Global Profile Switcher Design

## Goal

Place the active profile next to the notification button so profile-dependent features have a visible, globally accessible selection.

## States

- **Loading:** show a compact skeleton without shifting the header.
- **No profiles:** show **Create profile**; selecting it opens the Profile page.
- **One profile:** show its name without a dropdown chevron and automatically persist it as active. The backend already marks the first created profile as default.
- **Multiple profiles:** show the active profile name with a dropdown. If the stored selection is missing or stale, use the default profile. Choosing another profile updates the global active-profile store.
- **No valid default:** show **Select profile** and allow explicit selection.
- **Error:** show **Profiles unavailable** with a path to profile management.

The first profile remains default when more profiles are created. Default changes continue to use the existing explicit Set default action.

## Dropdown

The dropdown lists profile names, identifies the active and default profiles, closes on outside click, and ends with **Manage profiles**. It is viewport-aligned under the header control and does not affect header height.

## Integration

`ProfileSwitcher` owns the profiles query and active-profile resolution. `Shell` renders it immediately before the notification button. Existing pages continue consuming `useActiveProfileId`, so switching updates Quick Apply, candidate filters, applications, and other profile-aware queries.

## Testing

Tests cover empty, single, multiple, default fallback, stale selection, explicit selection, and dropdown closing. Full frontend tests, build, lint, and live browser inspection verify integration.
