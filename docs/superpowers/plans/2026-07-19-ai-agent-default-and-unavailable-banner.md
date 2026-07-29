# AI Agent Default Selection and Unavailable Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-select a default AI provider/model from what is actually installed, heal stale saved preferences, and show a red "configure agent first" banner when no provider is available.

**Architecture:** Pure selection logic in one testable module, consumed by a shared hook mounted once per React root (dashboard + side panel) that auto-saves a per-profile default, plus a shared banner component that renders when no provider is available. No backend changes.

**Tech Stack:** WXT + React 19, TanStack Query, Zod, TypeScript. Extension package under `extension/`. Run commands from `extension/` with `pnpm`.

## Global Constraints

- **Runtime:** Node 20; use `pnpm` (pinned via `corepack prepare pnpm@10.15.0 --activate` — the default corepack pnpm 11 crashes on Node 20).
- **No git repo:** do not run `git` commands. Each task ends with a verification gate instead of a commit.
- **No unit-test framework** (POC decision): logic is verified by a `tsx` validator script following the existing `scripts/validate-*.ts` convention, plus `pnpm compile` (tsc) and manual browser verification. Do not add jest/vitest.
- **Provider id type:** `ProviderInfo['id']` and `AiPreference['provider']` are both `'ollama' | 'openai'` — no casts needed between them.
- **Shared query key:** all provider reads use `providersQueryKey` from `extension/api/ai.ts` so TanStack Query dedupes them across hook/banner/settings.
- **AI preferences are per profile** (`Profile.ai_preferences`); provider availability is system-wide.
- **Existing side effects of saving a preference** (must be replicated by the hook): invalidate `profileQueryKey(profileId)` and set `browser.storage.local` key `activeProfileRevision` to `Date.now()`.

---

### Task 1: Pure default-selection logic + validator

**Files:**
- Create: `extension/features/ai/ai-default.ts`
- Create: `extension/scripts/validate-ai-default.ts`
- Modify: `extension/package.json` (add one script line)

**Interfaces:**
- Consumes: `ProviderInfo`, `AiPreference` types from `extension/schemas/backend.ts`.
- Produces (relied on by Tasks 2, 3, 5):
  - `deriveAiDefault(providers: ProviderInfo[]): AiPreference | null`
  - `isAgentAvailable(providers: ProviderInfo[]): boolean`
  - `isPreferenceValid(providers: ProviderInfo[], saved: { provider?: string | null; model?: string | null } | null | undefined): boolean`
  - `formatDefaultNotice(preference: AiPreference): string`

- [ ] **Step 1: Write the validator (the failing test)**

Create `extension/scripts/validate-ai-default.ts`:

```ts
import assert from 'node:assert/strict';
import type { ProviderInfo } from '../schemas/backend';
import {
  deriveAiDefault,
  formatDefaultNotice,
  isAgentAvailable,
  isPreferenceValid,
} from '../features/ai/ai-default';

function provider(overrides: Partial<ProviderInfo>): ProviderInfo {
  return {
    id: 'ollama',
    label: 'Ollama',
    available: true,
    models: [],
    selected_model: null,
    status: 'available',
    ...overrides,
  };
}

const ollamaReady = provider({ id: 'ollama', models: ['deepseek-coder:1.3b', 'qwen2.5:3b'] });
const ollamaDown = provider({ id: 'ollama', available: false, models: [], status: 'unavailable' });
const openaiReady = provider({ id: 'openai', label: 'OpenAI', models: ['gpt-4o-mini'] });
const openaiOff = provider({ id: 'openai', label: 'OpenAI', available: false, models: [], status: 'not_configured' });

// Default picks the first available provider and its first model.
assert.deepEqual(deriveAiDefault([ollamaReady, openaiOff]), {
  provider: 'ollama',
  model: 'deepseek-coder:1.3b',
});

// Falls through to the next available provider when the first is down.
assert.deepEqual(deriveAiDefault([ollamaDown, openaiReady]), {
  provider: 'openai',
  model: 'gpt-4o-mini',
});

// Honours selected_model over models[0] when present.
assert.deepEqual(
  deriveAiDefault([provider({ id: 'ollama', models: ['a', 'b'], selected_model: 'b' })]),
  { provider: 'ollama', model: 'b' },
);

// No available provider -> null / not available.
assert.equal(deriveAiDefault([ollamaDown, openaiOff]), null);
assert.equal(isAgentAvailable([ollamaDown, openaiOff]), false);
assert.equal(isAgentAvailable([ollamaReady, openaiOff]), true);

// Valid saved preference is preserved.
assert.equal(isPreferenceValid([ollamaReady], { provider: 'ollama', model: 'qwen2.5:3b' }), true);

// Stale saved model (not installed) is rejected -> triggers re-default.
assert.equal(isPreferenceValid([ollamaReady], { provider: 'ollama', model: 'qwen3:4b' }), false);

// Saved preference for an unavailable provider is rejected.
assert.equal(
  isPreferenceValid([ollamaDown, openaiReady], { provider: 'ollama', model: 'qwen2.5:3b' }),
  false,
);

// Empty / missing preferences are rejected.
assert.equal(isPreferenceValid([ollamaReady], null), false);
assert.equal(isPreferenceValid([ollamaReady], { provider: 'ollama', model: '' }), false);
assert.equal(isPreferenceValid([ollamaReady], { provider: 'bogus', model: 'x' }), false);

// Notice text.
assert.equal(
  formatDefaultNotice({ provider: 'ollama', model: 'qwen2.5:3b' }),
  'Defaulted to Ollama · qwen2.5:3b',
);

console.log('Validated AI default selection');
```

- [ ] **Step 2: Add the package script**

In `extension/package.json`, add to `scripts` (next to the other `validate:*` entries):

```json
"validate:ai-default": "tsx scripts/validate-ai-default.ts",
```

- [ ] **Step 3: Run the validator to verify it fails**

Run: `pnpm validate:ai-default`
Expected: FAIL — cannot resolve `../features/ai/ai-default` (module not created yet).

- [ ] **Step 4: Implement the logic**

Create `extension/features/ai/ai-default.ts`:

```ts
import type { AiPreference, ProviderInfo } from '../../schemas/backend';

type SavedPreference = { provider?: string | null; model?: string | null } | null | undefined;

export function deriveAiDefault(providers: ProviderInfo[]): AiPreference | null {
  for (const provider of providers) {
    if (!provider.available) continue;
    const model = provider.selected_model ?? provider.models[0];
    if (model) {
      return { provider: provider.id, model };
    }
  }
  return null;
}

export function isAgentAvailable(providers: ProviderInfo[]): boolean {
  return deriveAiDefault(providers) !== null;
}

export function isPreferenceValid(providers: ProviderInfo[], saved: SavedPreference): boolean {
  if (!saved || (saved.provider !== 'ollama' && saved.provider !== 'openai') || !saved.model) {
    return false;
  }
  const provider = providers.find((item) => item.id === saved.provider);
  return Boolean(provider && provider.available && provider.models.includes(saved.model));
}

export function formatDefaultNotice(preference: AiPreference): string {
  const labels: Record<AiPreference['provider'], string> = { ollama: 'Ollama', openai: 'OpenAI' };
  return `Defaulted to ${labels[preference.provider]} · ${preference.model}`;
}
```

- [ ] **Step 5: Run the validator to verify it passes**

Run: `pnpm validate:ai-default`
Expected: PASS — prints `Validated AI default selection`.

- [ ] **Step 6: Verification gate**

Run: `pnpm compile`
Expected: no type errors.

---

### Task 2: `useEnsureAiDefault` hook

**Files:**
- Create: `extension/features/ai/use-ensure-ai-default.ts`

**Interfaces:**
- Consumes: `deriveAiDefault`, `isPreferenceValid`, `formatDefaultNotice` (Task 1); `getProviders`, `providersQueryKey`, `saveAiPreference` from `extension/api/ai.ts`; `profileQueryKey` from `extension/api/profiles.ts`; `useActiveBackendProfile` from `extension/features/profile/use-active-backend-profile.ts`.
- Produces (relied on by Task 4): `useEnsureAiDefault(): { notice: string | null; dismiss: () => void }`.

- [ ] **Step 1: Implement the hook**

Create `extension/features/ai/use-ensure-ai-default.ts`:

```ts
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProviders, providersQueryKey, saveAiPreference } from '../../api/ai';
import { profileQueryKey } from '../../api/profiles';
import { useActiveBackendProfile } from '../profile/use-active-backend-profile';
import { deriveAiDefault, formatDefaultNotice, isPreferenceValid } from './ai-default';

export function useEnsureAiDefault(): { notice: string | null; dismiss: () => void } {
  const active = useActiveBackendProfile();
  const queryClient = useQueryClient();
  const providers = useQuery({ queryKey: providersQueryKey, queryFn: getProviders });
  const [notice, setNotice] = useState<string | null>(null);
  const attempted = useRef<Set<string>>(new Set());

  const profileId = active.profileId;
  const backendProfile = active.state.status === 'available' ? active.state.profile : null;
  const providerList = providers.data?.providers ?? null;

  useEffect(() => {
    if (!profileId || !backendProfile || !providerList) return;
    if (attempted.current.has(profileId)) return;
    if (isPreferenceValid(providerList, backendProfile.ai_preferences)) return;
    const preference = deriveAiDefault(providerList);
    if (!preference) return;
    attempted.current.add(profileId);
    void saveAiPreference(profileId, preference)
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: profileQueryKey(profileId) });
        await browser.storage.local.set({ activeProfileRevision: Date.now() });
        setNotice(formatDefaultNotice(preference));
      })
      .catch((error) => {
        console.warn('Failed to auto-select AI default', error);
      });
  }, [profileId, backendProfile, providerList, queryClient]);

  return { notice, dismiss: () => setNotice(null) };
}
```

Note: the direct `saveAiPreference` call guarded by the `attempted` ref is intentional — it avoids firing a mutation from inside an effect while still running exactly once per profile.

- [ ] **Step 2: Verification gate**

Run: `pnpm compile`
Expected: no type errors.

---

### Task 3: `AgentUnavailableBanner` component + styles

**Files:**
- Create: `extension/features/ai/agent-unavailable-banner.tsx`
- Modify: `extension/styles/globals.css` (append new rules)

**Interfaces:**
- Consumes: `isAgentAvailable` (Task 1); `getProviders`, `providersQueryKey` from `extension/api/ai.ts`.
- Produces (relied on by Tasks 4, 5): `AgentUnavailableBanner({ actionLabel, onAction }: { actionLabel: string; onAction: () => void })`.

- [ ] **Step 1: Implement the banner**

Create `extension/features/ai/agent-unavailable-banner.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { getProviders, providersQueryKey } from '../../api/ai';
import { isAgentAvailable } from './ai-default';

export function AgentUnavailableBanner({
  actionLabel,
  onAction,
}: {
  actionLabel: string;
  onAction: () => void;
}) {
  const providers = useQuery({ queryKey: providersQueryKey, queryFn: getProviders });
  if (providers.isPending || providers.isError || !providers.data) return null;
  if (isAgentAvailable(providers.data.providers)) return null;
  return (
    <div className="agent-banner" role="alert">
      <TriangleAlert size={18} />
      <div>
        <strong>Configure an agent first</strong>
        <span>
          No AI provider is available. Start Ollama with a model, or set an OpenAI key in the
          backend, then retry.
        </span>
      </div>
      <button type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Append styles**

Add to the end of `extension/styles/globals.css`:

```css
.agent-banner { display: flex; align-items: center; gap: .6rem; margin: 0 0 .8rem; padding: .7rem .8rem; color: white; background: var(--danger); border-radius: var(--radius-md); font-size: .78rem; }
.agent-banner > div { min-width: 0; flex: 1; display: grid; gap: .1rem; }
.agent-banner span { opacity: .92; line-height: 1.4; }
.agent-banner button { flex: 0 0 auto; padding: .35rem .7rem; color: var(--danger); background: white; border: 0; border-radius: var(--radius-sm); font-weight: 800; cursor: pointer; }
.ai-notice { display: flex; align-items: center; gap: .5rem; margin: 0 0 .8rem; padding: .55rem .7rem; color: #145c2f; background: #e2f5ed; border: 1px solid #9ed9ba; border-radius: var(--radius-sm); font-size: .75rem; }
.ai-notice button { margin-left: auto; padding: 0; border: 0; background: transparent; color: inherit; font-weight: 800; cursor: pointer; text-decoration: underline; }
```

- [ ] **Step 3: Verification gate**

Run: `pnpm compile`
Expected: no type errors. (If `TriangleAlert` is not exported by the installed `lucide-react`, use `AlertTriangle` instead — verify with `node -e "console.log(Object.keys(require('lucide-react')).filter(n=>/Triangle/.test(n)))"` from `extension/`.)

---

### Task 4: Wire hook + banner into both App roots

**Files:**
- Modify: `extension/entrypoints/dashboard/App.tsx`
- Modify: `extension/entrypoints/sidepanel/App.tsx`

**Interfaces:**
- Consumes: `useEnsureAiDefault` (Task 2), `AgentUnavailableBanner` (Task 3). Dashboard already has `setSection`/`window.location.hash`; side panel already imports `openDashboard`.

- [ ] **Step 1: Dashboard — add imports**

In `extension/entrypoints/dashboard/App.tsx`, add after the existing feature imports (after the `useActiveBackendProfile` import line):

```tsx
import { AgentUnavailableBanner } from '../../features/ai/agent-unavailable-banner';
import { useEnsureAiDefault } from '../../features/ai/use-ensure-ai-default';
```

- [ ] **Step 2: Dashboard — call the hook**

Inside `export default function App()`, immediately after `const activeProfile = useActiveBackendProfile();`, add:

```tsx
const aiDefault = useEnsureAiDefault();
```

- [ ] **Step 3: Dashboard — render banner + notice**

In the returned JSX, insert directly after the closing `</header>` and before `<nav className="dashboard-nav" ...>`:

```tsx
<AgentUnavailableBanner actionLabel="Open Settings" onAction={() => { setSection('settings'); window.location.hash = 'settings'; }} />
{aiDefault.notice ? <div className="ai-notice" role="status"><span>{aiDefault.notice}</span><button type="button" onClick={aiDefault.dismiss}>Dismiss</button></div> : null}
```

- [ ] **Step 4: Side panel — add imports**

In `extension/entrypoints/sidepanel/App.tsx`, add after the `useActiveBackendProfile` / `SidebarProfileSelector` imports:

```tsx
import { AgentUnavailableBanner } from '../../features/ai/agent-unavailable-banner';
import { useEnsureAiDefault } from '../../features/ai/use-ensure-ai-default';
```

- [ ] **Step 5: Side panel — call the hook**

Inside `export default function App()`, immediately after `const activeProfile = useActiveBackendProfile();`, add:

```tsx
const aiDefault = useEnsureAiDefault();
```

- [ ] **Step 6: Side panel — render banner + notice**

In the returned JSX, insert directly after the closing `</header>` and before `<StepIndicator ... />`:

```tsx
<AgentUnavailableBanner actionLabel="Open Settings" onAction={() => void openDashboard('settings')} />
{aiDefault.notice ? <div className="ai-notice" role="status"><span>{aiDefault.notice}</span><button type="button" onClick={aiDefault.dismiss}>Dismiss</button></div> : null}
```

- [ ] **Step 7: Verification gate**

Run: `pnpm compile`
Expected: no type errors.

---

### Task 5: Settings AI card — no-agent block

**Files:**
- Modify: `extension/features/dashboard/settings-page.tsx`

**Interfaces:**
- Consumes: `AgentUnavailableBanner` (Task 3). `settings-page.tsx` already holds a `providers` query (`useQuery({ queryKey: providersQueryKey, queryFn: getProviders })`).

- [ ] **Step 1: Add the import**

In `extension/features/dashboard/settings-page.tsx`, add after the existing `../../api/ai` import:

```tsx
import { AgentUnavailableBanner } from '../../features/ai/agent-unavailable-banner';
```

- [ ] **Step 2: Render the block inside the AI card**

In the `<section className="settings-card ai-settings">`, immediately after the `<p>Ollama keeps prompts ...</p>` sentence and before the `{providers.isError ? ...}` expression, insert:

```tsx
<AgentUnavailableBanner actionLabel="Retry" onAction={() => void providers.refetch()} />
```

- [ ] **Step 3: Verification gate**

Run: `pnpm compile`
Expected: no type errors.

---

### Task 6: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `pnpm compile`
Expected: PASS, no output errors.

- [ ] **Step 2: Logic validator**

Run: `pnpm validate:ai-default`
Expected: `Validated AI default selection`.

- [ ] **Step 3: Existing validators still pass**

Run: `pnpm validate:fixtures && pnpm validate:workflow && pnpm validate:sync && pnpm validate:active-profile && pnpm validate:no-runtime-mocks`
Expected: all five print their "Validated ..." lines with exit 0.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: `Built extension in ...` with `dashboard.html` and `sidepanel.html` emitted, exit 0.

- [ ] **Step 5: Manual — agent-available path**

With the backend running (`http://127.0.0.1:8000`) and Ollama reachable with ≥1 model, load the extension (or serve the built dashboard in a Chrome extension context). Select/confirm a profile. Expected: no red banner; a green "Defaulted to Ollama · <model>" notice appears once; `GET /profiles/{id}` shows `ai_preferences` populated; Scan/analyze no longer returns `AI_PREFERENCE_REQUIRED`.

- [ ] **Step 6: Manual — no-agent path**

Simulate no provider available (stop Ollama and leave OpenAI unconfigured, or temporarily point `OLLAMA_BASE_URL` at a dead port and restart the api container). Reload the extension surfaces. Expected: red "Configure an agent first" banner at the top of both the dashboard and the side panel, and inside the Settings AI card with a working Retry button; no default notice; no auto-save attempt loops (check console/network).
```
