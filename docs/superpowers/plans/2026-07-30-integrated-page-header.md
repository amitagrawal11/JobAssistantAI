# Integrated Page Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Remove the redundant global shell header and render global utilities beside each page's real title, with parent navigation only on nested views.

**Architecture:** Create a reusable `PageHeader` component that owns the title block, optional back navigation, page actions, profile selector, and notification control. Remove breadcrumb and profile-query responsibilities from `App.tsx`, then migrate every routed page and nested profile/tailor view to the shared component.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Shared PageHeader component

**Files:**
- Create: `webapp/src/components/page-header.tsx`
- Create: `webapp/src/components/page-header.test.tsx`

- [x] **Step 1: Write failing component tests**

Test that `PageHeader` renders one heading, optional description, actions before
the global utilities, no back control on top-level pages, and a clickable
`Back to Profiles` control when `backLabel="Profiles"` is supplied.

- [x] **Step 2: Verify RED**

Run:

```bash
cd webapp
npx vitest run src/components/page-header.test.tsx
```

Expected: FAIL because `page-header.tsx` does not exist.

- [x] **Step 3: Implement PageHeader**

Export:

```ts
type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  backLabel?: string;
  onBack?: () => void;
  actions?: ReactNode;
};
```

Render a responsive title/actions row. Place `actions`, `ProfileSwitcher`, and
the labelled notification button in that order. When both back properties are
present, render a compact `ArrowLeft` button above the title with accessible
name `Back to ${backLabel}`.

- [x] **Step 4: Verify GREEN**

Run the focused component test and expect all tests to pass.

### Task 2: Remove the global shell header

**Files:**
- Modify: `webapp/src/app-profile-navigation.test.ts`
- Modify: `webapp/src/App.tsx`

- [x] **Step 1: Write failing shell contracts**

Require `App.tsx` to contain no `Breadcrumb`, no main `<header>`, no
`ProfileSwitcher`, and no notification button. Require the routed content
wrapper to keep horizontal/bottom padding while using a compact top inset.

- [x] **Step 2: Verify RED**

Run:

```bash
cd webapp
npx vitest run src/app-profile-navigation.test.ts
```

Expected: FAIL while the 64px global header still exists.

- [x] **Step 3: Simplify App.tsx**

Remove `Breadcrumb`, its profile query and route-label logic, the global
`<header>`, and unused imports. Remove the sidebar brand bottom border. Keep the
content panel, routes, scrolling, and `px-8 pb-7 pt-4` content inset.

- [x] **Step 4: Verify GREEN**

Run the focused shell tests and expect them to pass.

### Task 3: Migrate top-level page headings

**Files:**
- Modify: `webapp/src/pages/overview.tsx`
- Modify: `webapp/src/pages/browse-jobs.tsx`
- Modify: `webapp/src/pages/applications.tsx`
- Modify: `webapp/src/pages/autoapply.tsx`
- Modify: `webapp/src/pages/settings.tsx`

- [x] **Step 1: Add failing page source contracts**

Create or extend page source tests to require `PageHeader` in each routed page
and reject the old standalone top-level heading strings.

- [x] **Step 2: Verify RED**

Run the affected page tests and expect failure while standalone headings remain.

- [x] **Step 3: Replace top-level headings**

Use `PageHeader` for each page title and description. Pass the Auto-Apply
toggle/settings group and Overview dashboard-profile selector through
`actions`. Keep all content below the header and preserve existing margin
rhythm.

- [x] **Step 4: Verify GREEN**

Run the focused page tests and expect them to pass.

### Task 4: Migrate Tailor and Profile nested states

**Files:**
- Modify: `webapp/src/pages/tailor.tsx`
- Modify: `webapp/src/pages/documents.tsx`
- Modify: `webapp/src/pages/profile-processing-layout.test.ts`

- [x] **Step 1: Write failing nested-navigation contracts**

Require Tailor review to use `backLabel="Tailor Assistant"` and Profile detail
to use `backLabel="Profiles"`. Require profile management, onboarding, and
processing views to use `PageHeader`.

- [x] **Step 2: Verify RED**

Run:

```bash
cd webapp
npx vitest run src/pages/profile-processing-layout.test.ts
```

Expected: FAIL while nested headings and the Tailor close icon own navigation.

- [x] **Step 3: Migrate nested views**

Use `PageHeader` for Tailor setup/review, Profiles management, onboarding,
profile processing, and profile detail. Route back actions to the existing
state reset or `/profile?manage=1`. Preserve editable profile fields and all
processing behavior.

- [x] **Step 4: Verify GREEN**

Run the nested-layout and shared-header tests and expect them to pass.

### Task 5: Full verification

**Files:**
- Verify only

- [x] **Step 1: Run all frontend tests**

```bash
cd webapp
npm test -- --run
```

- [x] **Step 2: Build**

```bash
cd webapp
npm run build
```

- [x] **Step 3: Lint**

```bash
cd webapp
npm run lint
```

- [x] **Step 4: Inspect the live application**

Verify Browse Jobs and another top-level page show utilities beside the title
without a duplicate breadcrumb. Verify profile detail shows `Back to Profiles`,
the title only once, and the same utility controls. Confirm responsive wrapping
does not create horizontal overflow.
