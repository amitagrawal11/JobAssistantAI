# AI Agent Default Selection and Unavailable Banner Design

## Goal

Make AI-backed flows work out of the box by auto-selecting a default provider and model from what is actually installed, and make the "no AI provider available" condition unmistakable with a red "configure agent first" banner. This removes the failure where a saved or configured model (for example `qwen3:4b`) is not installed on the host, leaving Scan, Match, and Tailor unable to run.

## Background

`GET /ai/providers` already returns each provider's live availability, installed `models` (sorted), and `status`. The backend gates AI operations with `AI_PREFERENCE_REQUIRED` (409) until a profile has a saved `ai_preferences.provider` and `ai_preferences.model`. AI preferences are stored per profile on the `Profile` entity; provider availability is system-wide. Today the Settings page requires the user to manually pick a provider, pick a model, test, and save, with no default and no explicit "no agent" state. No backend change is required for this feature.

## Default selection

Default selection is a per-profile action and runs wherever the app is mounted, through a shared hook used once in each React root (dashboard and side panel).

When an active profile is available and its saved preference is not valid, and at least one provider is available, the hook selects the first available provider (registry order: `ollama`, then `openai`) and that provider's first model (`selected_model` if present, otherwise `models[0]`). It persists the choice through the existing `PATCH /profiles/{id}/ai-preferences`, then invalidates the active profile query and bumps `activeProfileRevision` in extension local storage, matching the side effects of a manual Settings save. On success it surfaces a dismissible confirmation, for example "Defaulted to Ollama · qwen2.5:3b".

A saved preference is valid only when its provider is currently available and its model is present in that provider's live `models` list. A saved-but-uninstalled model is therefore treated as invalid and re-defaulted, which is the direct fix for the `qwen3:4b` case.

The hook auto-saves at most once per profile id, tracked with a ref, and does not retry on failure. If auto-save fails, the user can still choose a model manually in Settings.

## Unavailable banner

"No LLM agent" means the providers query loaded successfully and every provider reports `available: false`. In that case a red block reading "Configure an agent first" appears in three places, all driven by the same self-contained component that runs its own providers query:

- A persistent red banner at the top of the dashboard shell.
- A persistent red banner at the top of the side panel shell.
- An inline red block in the Settings AI-provider card, with a Retry action that refetches providers.

Each banner offers a way to configure: the dashboard switches to the Settings section, the side panel opens the dashboard Settings page through `openDashboard('settings')`. The message explains the remediation available in this POC (start Ollama with a model, or set an OpenAI key in the backend, then retry), because provider configuration itself is external to the extension.

The banner renders only when providers have loaded and none are available. When the providers query is still loading, or errors because the backend is down, the banner does not render; backend-unavailable is a separate condition owned by the existing error and profile-status states.

## Components and boundaries

New modules live under `extension/features/ai/`:

- `ai-default.ts` — pure logic with no React or network dependencies: `isAgentAvailable(providers)`, `isPreferenceValid(providers, saved)`, `deriveAiDefault(providers)` returning `{ provider, model }` or `null`, and `formatDefaultNotice(preference)`.
- `use-ensure-ai-default.ts` — the hook. It composes `useActiveBackendProfile()`, the providers query, and the `saveAiPreference` mutation, and returns `{ notice, dismiss }` for the host root to render.
- `agent-unavailable-banner.tsx` — the red banner component. It takes an `onConfigure` handler and renders only when no agent is available.

Edited files:

- `extension/entrypoints/dashboard/App.tsx` and `extension/entrypoints/sidepanel/App.tsx` mount the banner and a small notice bar and call the hook. The dashboard wires `onConfigure` to its section state; the side panel wires it to `openDashboard('settings')`.
- `extension/features/dashboard/settings-page.tsx` renders the shared no-agent block inside the AI card with a Retry action. The existing effect continues to prefill the saved preference, so an auto-selected default appears as the current selection.
- `extension/styles/globals.css` gains styling for the red block and the confirmation notice.

## Errors and edge cases

- No active profile selected: no default is saved because the preference is per profile. The global banner still appears if no agent is available.
- Providers query error (backend down): no banner; existing states handle it. Auto-default does not run.
- Auto-save failure: logged, not retried, no loop; manual Settings selection remains available.
- Stale saved model (provider available but model uninstalled): treated as invalid and re-defaulted.
- Only OpenAI available (Ollama down): default selects OpenAI and its first model.

## Verification

- New `scripts/validate-ai-default.ts` with a `validate:ai-default` package script asserts, against the pure logic in `ai-default.ts`: default picks the first available provider and its first model; returns `null` when no provider is available; a valid saved preference is preserved; a saved preference whose model is not installed is rejected and re-defaulted; a saved preference for an unavailable provider is rejected.
- `pnpm compile` passes.
- Existing validation scripts (`validate:fixtures`, `validate:workflow`, `validate:sync`, `validate:active-profile`, `validate:no-runtime-mocks`) still pass.
- Manual browser verification against the live backend for the agent-available path (default is saved, confirmation shown, Scan proceeds) and a simulated no-agent path (red banner in both surfaces and in Settings).

## Out of scope

No new global toast system; the confirmation is a local per-root notice. No model recommendation or sizing heuristic beyond first-sorted-model. No changes to backend model resolution or the `AI_PREFERENCE_REQUIRED` gate.
