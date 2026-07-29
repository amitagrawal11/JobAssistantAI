# Fixed Page Scroll Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every main-area page a consistent 24px inset, keep the application shell stationary, isolate scrolling to page content, and place nested-page back arrows inline with titles.

**Architecture:** Add small shared `PageLayout` and `PageScrollArea` primitives that establish the required `flex`, `min-height: 0`, and overflow boundaries. The app shell owns viewport padding but no scrolling; each route explicitly chooses which content scrolls. Browse Jobs keeps its controls and pagination outside its dedicated results scroller.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, React Router, Vitest, Testing Library

---

### Task 1: Shared fixed page frame

**Files:**
- Create: `webapp/src/components/page-layout.tsx`
- Create: `webapp/src/components/page-layout.test.tsx`
- Modify: `webapp/src/App.tsx`
- Modify: `webapp/src/app-profile-navigation.test.ts`

- [ ] **Step 1: Write failing component and shell tests**

Create a component test that renders `PageLayout` and `PageScrollArea`, then asserts their contracts through stable test IDs and classes:

```tsx
render(
  <PageLayout>
    <div>Header</div>
    <PageScrollArea>Content</PageScrollArea>
  </PageLayout>,
);

expect(screen.getByTestId('page-layout')).toHaveClass('flex', 'h-full', 'min-h-0', 'flex-col');
expect(screen.getByTestId('page-scroll-area')).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
```

Extend the source-level shell test to require:

```ts
expect(appSource).toContain('flex-1 min-h-0 overflow-hidden p-6');
expect(appSource).not.toContain('flex-1 overflow-auto px-8 pb-7 pt-4');
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
cd webapp && npm test -- src/components/page-layout.test.tsx src/app-profile-navigation.test.ts
```

Expected: FAIL because `page-layout.tsx` does not exist and the route wrapper still owns scrolling.

- [ ] **Step 3: Implement the shared primitives and shell boundary**

Create:

```tsx
import type { HTMLAttributes } from 'react';

export function PageLayout({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-testid="page-layout"
      className={`flex h-full min-h-0 w-full flex-col ${className}`}
      {...props}
    />
  );
}

export function PageScrollArea({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-testid="page-scroll-area"
      className={`min-h-0 flex-1 overflow-y-auto ${className}`}
      {...props}
    />
  );
}
```

Change the route wrapper in `App.tsx` to:

```tsx
<div className="flex-1 min-h-0 overflow-hidden p-6">
  <Routes>{/* existing routes */}</Routes>
</div>
```

- [ ] **Step 4: Run the focused tests and verify success**

Run:

```bash
cd webapp && npm test -- src/components/page-layout.test.tsx src/app-profile-navigation.test.ts
```

Expected: PASS.

### Task 2: Inline icon-only nested navigation

**Files:**
- Modify: `webapp/src/components/page-header.tsx`
- Modify: `webapp/src/components/page-header.test.tsx`

- [ ] **Step 1: Update the PageHeader test first**

Require the back button to have an accessible name, no visible breadcrumb label, and to sit in the same title row:

```tsx
render(<PageHeader title="Amit Agrawal" backLabel="Profiles" onBack={onBack} />);

const back = screen.getByRole('button', { name: 'Back to Profiles' });
expect(back).toHaveAttribute('title', 'Back to Profiles');
expect(back.parentElement).toContainElement(screen.getByRole('heading', { name: 'Amit Agrawal' }));
expect(screen.queryByText('Profiles')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```bash
cd webapp && npm test -- src/components/page-header.test.tsx
```

Expected: FAIL because the visible `Profiles` label is currently rendered above the title.

- [ ] **Step 3: Move the back control beside the title**

Replace the left side of `PageHeader` with an inline title group:

```tsx
<div className="flex min-w-0 flex-1 items-start gap-2">
  {backLabel && onBack ? (
    <button
      type="button"
      aria-label={`Back to ${backLabel}`}
      title={`Back to ${backLabel}`}
      onClick={onBack}
      className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
    >
      <ArrowLeft className="size-4.5" />
    </button>
  ) : null}
  <div className="min-w-0 flex-1">
    <h1 className="text-[26px] font-bold tracking-[-0.02em] text-foreground">{title}</h1>
    {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
  </div>
</div>
```

- [ ] **Step 4: Run the focused test and verify success**

Run:

```bash
cd webapp && npm test -- src/components/page-header.test.tsx
```

Expected: PASS.

### Task 3: Browse Jobs isolated results scrolling

**Files:**
- Modify: `webapp/src/pages/browse-jobs.tsx`
- Modify: `webapp/src/pages/browse-jobs-layout.test.ts`

- [ ] **Step 1: Add failing source-level layout assertions**

Assert that Browse Jobs uses the shared full-height frame, labels its results scroller, and keeps pagination after the closing results region:

```ts
expect(source).toContain('<PageLayout>');
expect(source).toContain('data-testid="job-results-scroll"');
expect(source).toContain('className="min-h-0 flex-1 overflow-y-auto');

const resultsEnd = source.indexOf('{/* pagination */}');
const resultsStart = source.indexOf('data-testid="job-results-scroll"');
expect(resultsStart).toBeGreaterThan(-1);
expect(resultsEnd).toBeGreaterThan(resultsStart);
expect(source.slice(resultsEnd)).toContain('Page {filters.page} of {totalPages}');
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
cd webapp && npm test -- src/pages/browse-jobs-layout.test.ts
```

Expected: FAIL because the whole page currently flows inside the shell scroller.

- [ ] **Step 3: Split fixed controls, scrolling results, and fixed pagination**

Import `PageLayout`, make the root `<PageLayout>`, keep `PageHeader`, `JobFilterBar`, and the select/sort row above the results region, then wrap every cards-state branch with:

```tsx
<div
  data-testid="job-results-scroll"
  className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1"
>
  {query.isLoading ? (
    // existing skeleton grid without its outer mt-4
  ) : query.isError ? (
    // existing error state without its outer mt-4
  ) : jobs.length === 0 ? (
    // existing empty state without its outer mt-4
  ) : (
    // existing job-card grid without its outer mt-4
  )}
</div>
```

Keep pagination after this div, reduce its top gap to `mt-3`, and close `PageLayout` after pagination.

- [ ] **Step 4: Run the focused test and verify success**

Run:

```bash
cd webapp && npm test -- src/pages/browse-jobs-layout.test.ts
```

Expected: PASS.

### Task 4: Apply the shared scroll contract to every route

**Files:**
- Modify: `webapp/src/pages/overview.tsx`
- Modify: `webapp/src/pages/documents.tsx`
- Modify: `webapp/src/pages/applications.tsx`
- Modify: `webapp/src/pages/autoapply.tsx`
- Modify: `webapp/src/pages/settings.tsx`
- Modify: `webapp/src/pages/tailor.tsx`
- Modify: `webapp/src/pages/page-header-integration.test.ts`

- [ ] **Step 1: Add failing integration assertions**

Add the shared component import and usage requirements:

```ts
for (const page of pages) {
  expect(source(page), page).toContain("import { PageLayout");
  expect(source(page), page).toContain('<PageLayout');
}

expect(source('overview.tsx')).toContain('<PageHeader title="Overview" />');
expect(source('overview.tsx')).not.toContain('Your job search at a glance');
expect(source('overview.tsx')).not.toContain('Dashboard');
```

For the main route implementations, assert that content is wrapped in `PageScrollArea`:

```ts
for (const page of ['overview.tsx', 'documents.tsx', 'applications.tsx', 'autoapply.tsx', 'settings.tsx', 'tailor.tsx']) {
  expect(source(page), page).toContain('<PageScrollArea');
}
```

- [ ] **Step 2: Run the integration test and verify failure**

Run:

```bash
cd webapp && npm test -- src/pages/page-header-integration.test.ts
```

Expected: FAIL because the route pages do not yet declare their own scrolling boundaries and Overview has the old heading.

- [ ] **Step 3: Wrap page roots and content**

For each normal page state, replace the outer route root with:

```tsx
<PageLayout>
  <PageHeader /* existing props */ />
  <PageScrollArea className="mt-5 pr-1">
    <section>{pageContent}</section>
  </PageScrollArea>
</PageLayout>
```

Keep the current width contracts explicitly: Settings uses `className="mx-auto max-w-[1100px]"`; Tailor setup uses `className="mx-auto max-w-[760px]"`; the profile creation state uses `className="mx-auto max-w-[640px]"`; Overview, Applications, Auto-Apply, Tailor review, and other Profile states remain full width. `pageContent` in the example means the JSX currently following that state's `PageHeader`; move it unchanged into `PageScrollArea`. Keep loading and error states vertically centered inside `PageLayout`. In `overview.tsx`, change:

```tsx
<PageHeader title="Overview" />
```

For `TailorPage` review and profile detail in `documents.tsx`, retain the existing `backLabel` and `onBack` props; the shared header now renders them as the approved inline icon.

- [ ] **Step 4: Run the page integration tests and fix all route states**

Run:

```bash
cd webapp && npm test -- src/pages/page-header-integration.test.ts src/pages/profile-processing-layout.test.ts
```

Expected: PASS with every conditional page state returning a valid fixed frame.

### Task 5: Regression and browser verification

**Files:**
- Modify only if verification reveals a defect in the files already listed.

- [ ] **Step 1: Run all web tests**

Run:

```bash
cd webapp && npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run production build and lint**

Run:

```bash
cd webapp && npm run build
cd webapp && npm run lint
```

Expected: build succeeds; lint reports no errors. Existing unrelated warnings may remain.

- [ ] **Step 3: Verify Browse Jobs in the browser**

At the running local application:

- Confirm the main shell has equal 24px top/left/right/bottom inset.
- Confirm `main` and the routed page viewport do not scroll.
- Confirm `job-results-scroll` has `scrollHeight > clientHeight`.
- Scroll the job results and confirm the title, filters, toolbar, and pagination keep the same viewport positions.

- [ ] **Step 4: Verify nested profile navigation and representative routes**

- Open a profile and confirm the arrow is directly beside the profile name.
- Confirm no visible `Profiles` breadcrumb remains.
- Activate the back arrow and confirm it returns to profile management.
- Check Overview, Applications, Auto-Apply Queue, Tailor Assistant, and Settings: headers remain fixed and content remains reachable by scrolling its page-owned content region.

- [ ] **Step 5: Review the final diff**

Run:

```bash
git diff --check
git diff --stat
git status --short
```

Expected: no whitespace errors, only scoped frontend changes plus the user's pre-existing worktree changes.
