# AI Job Assistant Frontend Redesign Design

## Goal

Adopt the visual design system from the user's Claude Design mockup (`AI Job Assistant.dc.html`, project "AI Job Assistant Mockups") across the `frontend/` React app: a foundation theme (tokens, typography, primitives, shell) plus a full re-skin of every existing screen to match the mockup. Net-new feature screens in the mockup that have no code today are explicitly deferred.

## Source of truth

The mockup is `AI Job Assistant.dc.html` in Claude Design project `da261e78-a920-4d3d-9721-eee6add1dd5c`. It is a parameterized template (`{{ hue }}`, `{{ cmul }}`) whose light theme resolves to hue 265 (violet). Per-screen markup is pulled from that file during implementation. Its px values are at a scaled preview canvas (~0.53×), so ratios and the token *system* are adopted, not literal px.

## Design system (foundation)

### Color — OKLCH, hue-swappable

Tokens are expressed in OKLCH so the whole theme stays hue-swappable via `--brand-hue`, matching the mockup's approach.

```
--brand-hue: 265;            /* violet accent */
--brand-cmul: 1;

--primary:              oklch(0.58 calc(0.20 * var(--brand-cmul)) var(--brand-hue));
--primary-hover:        oklch(0.52 calc(0.20 * var(--brand-cmul)) var(--brand-hue));
--primary-foreground:   oklch(0.99 0.005 var(--brand-hue));
--accent-soft:          oklch(0.965 0.02 var(--brand-hue));   /* tinted surfaces / active nav */
--accent-soft-foreground: oklch(0.45 0.17 var(--brand-hue));

/* text — warm gray, hue 60 */
--foreground:        oklch(0.25 0.01 60);
--foreground-strong: oklch(0.20 0.01 60);
--muted-foreground:  oklch(0.52 0.01 60);

/* surfaces / borders — cool gray, hue 262 */
--background: oklch(0.965 0.004 262);
--surface:    oklch(1 0 0);
--border:     oklch(0.90 0.006 262);
--muted:      oklch(0.95 0.006 262);

/* semantic */
--success: oklch(0.40 0.13 145);  --success-soft: oklch(0.95 0.05 145);
--warning: oklch(0.55 0.13 75);   --warning-soft: oklch(0.95 0.05 75);
--danger:  oklch(0.55 0.19 25);   --danger-soft:  oklch(0.95 0.04 25);
```

These map onto the existing shadcn variable names already in `frontend/src/styles/globals.css` (`--primary`, `--background`, `--foreground`, `--card`, `--border`, `--ring`, `--muted`, `--accent`, `--sidebar*`, `--secondary`, `--destructive`, etc.) so all shadcn components inherit the theme with no per-component edits. `--ring` = the primary at a lighter L; `--card` = `--surface`; `--accent`/`--secondary` = `--accent-soft`; `--destructive` = `--danger`; sidebar tokens map to surface/foreground with `--sidebar-accent` = `--accent-soft`.

### Typography

- Body: **Inter** (weights 400/450/500/600/700).
- Headings (`h1–h3`, section titles): **Plus Jakarta Sans** (600/700/800), letter-spacing `-0.025em`.
- Plus Jakarta Sans is a **new dependency** — add `@fontsource-variable/plus-jakarta-sans` (and `@fontsource-variable/inter` if not already vendored) and import in `globals.css`; do not rely on the mockup's Google Fonts CDN link (offline-friendly, matches the existing local-font approach).

### Shape and elevation

```
--radius-sm: 0.625rem;  --radius-md: 0.875rem;  --radius-lg: 1.25rem;  --radius-pill: 999px;
--shadow-card: 0 1px 2px rgb(22 24 42 / 0.03), 0 18px 40px -22px rgb(22 24 42 / 0.12);
--shadow-pop:  0 1px 2px rgb(22 24 42 / 0.04), 0 8px 24px -12px rgb(22 24 42 / 0.16);
```

Cards: `--surface` on `--background`, `1px --border`, `--radius-md`, `--shadow-card`. Chips/pills: `--radius-pill`, `1px --border`. Inputs: `--radius-sm`, `1px --border`, focus ring `--ring`.

### Primitives to restyle (foundation)

Buttons (primary/secondary/ghost/danger + sm/md/icon), cards, inputs/textarea, chips/badges, tabs, select, checkbox/radio, progress, dialog, and the app shell (sidebar + header + content). These are shared shadcn components + a few custom classes in `globals.css`; restyling here re-skins ~80% of the app.

## App shell

Match the mockup's shell: left sidebar with brand mark at top, primary nav group, a labeled group (e.g. "AI FEATURES") where applicable, and a user/plan chip at the bottom; a content area on `--background` with section headings and card layouts. The app already uses shadcn `Sidebar`, so this is styling + structure (groups, brand chip, footer user chip), not a rewrite.

## Screen-by-screen re-skin (existing routes)

Each is rebuilt to match the corresponding mockup screen, pulling exact structure from `AI Job Assistant.dc.html` during implementation. Behavior/data wiring is preserved; only presentation changes.

- **Profile** (`/profile`, `ProfilePage`) — profile setup / completion, fact verification, matching the mockup's "Profile setup / Complete profile".
- **Browse Jobs** (`/jobs`, `JobsPage`) — job list / top-matches cards.
- **Documents** (`/documents`, `DocumentsPage`) — "My Resumes / Recently opened / All Files / Upload resume", incl. empty state.
- **Applications** (`/applications`, `ApplicationsPage`) — application tracker list.
- **Start Application flow** (`/applications/:id/start`, `StartApplicationFlow`) — the guided Job → Match → Tailor (→ Fill/Confirm placeholders) steps, re-skinned; Match shows the score ring + requirement breakdown; step indicator restyled.
- **Settings** (`/settings`, `SettingsPage`) — AI provider/model + preferences.

## Out of scope (deferred, net-new features)

These appear in the mockup but have no code today; each becomes its own spec + backend later: Resume **Builder** (templates, "Write with AI"), dashboard **analytics** ("Applications over time", "Outcomes" charts), **Quick Apply / Auto-apply / Pathway**. This redesign restyles existing screens only; it does not build new features.

## Error handling

Re-skin is presentation-only: preserve all existing loading/error/empty states, query wiring, and backend contracts. No API or data-flow changes. Backend-unavailable, agent-unavailable, and validation states keep their current behavior with restyled surfaces.

## Verification

Per the repo convention (no formal test framework in the frontend beyond tsc): `npm run build` (tsc + vite) after each phase; visual verification of each screen via the running app against the live backend (`./start.sh`); confirm no regression in existing flows (profile select, job analyze, match score). The oxlint config stays green.

## Delivery sequence (phased)

1. **Foundation** — token system (OKLCH violet), fonts (add Plus Jakarta Sans), radii/shadows in `globals.css`; verify existing app renders re-skinned with no breakage.
2. **App shell** — sidebar groups, brand chip, user/footer chip, header, content background.
3. **Screens**, one per phase, each independently reviewable: Profile → Browse Jobs → Documents → Applications → Start Application flow (incl. Match) → Settings.

Each phase ends with a green `npm run build` and a visual check before the next begins.
