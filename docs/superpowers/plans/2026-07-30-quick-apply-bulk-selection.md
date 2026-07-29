# Quick Apply Bulk Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate Quick Apply bulk selection from the external-site Auto-Apply queue and provide safe sequential bulk submission with visible progress and retryable failures.

**Architecture:** Extract selection-mode and sequential batch behavior into a pure, testable job-card module. Browse Jobs keeps UI state and API orchestration, but delegates batch sequencing and result collection to that module. The active application-method segment determines card labels, selection behavior, select-all semantics, and toolbar actions.

**Tech Stack:** React 19, TypeScript, TanStack Query, Vitest

---

### Task 1: Pipeline selection and sequential batch runner

**Files:**
- Create: `webapp/src/features/job-cards/job-application-selection.ts`
- Create: `webapp/src/features/job-cards/job-application-selection.test.ts`

- [ ] **Step 1: Write failing tests for mode resolution and sequential results**

Test:

```ts
expect(applicationSelectionMode(['quick_apply'])).toBe('quick_apply');
expect(applicationSelectionMode(['company_site'])).toBe('auto_apply');
```

Use a submit fake that records concurrency and fails one ID:

```ts
const active = new Set<string>();
let maxConcurrent = 0;
const result = await runQuickApplyBatch(['one', 'two', 'three'], async (id) => {
  active.add(id);
  maxConcurrent = Math.max(maxConcurrent, active.size);
  active.delete(id);
  if (id === 'two') throw new Error('failed');
}, onProgress);

expect(maxConcurrent).toBe(1);
expect(result).toEqual({ succeeded: ['one', 'three'], failed: ['two'] });
expect(onProgress).toHaveBeenLastCalledWith({ completed: 3, total: 3 });
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```bash
cd webapp && npm test -- src/features/job-cards/job-application-selection.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure module**

Export:

```ts
export type ApplicationSelectionMode = 'auto_apply' | 'quick_apply';

export function applicationSelectionMode(methods: string[]): ApplicationSelectionMode {
  return methods[0] === 'quick_apply' ? 'quick_apply' : 'auto_apply';
}

export async function runQuickApplyBatch(
  ids: string[],
  submit: (id: string) => Promise<void>,
  onProgress: (progress: { completed: number; total: number }) => void,
): Promise<{ succeeded: string[]; failed: string[] }> {
  const succeeded: string[] = [];
  const failed: string[] = [];
  for (const id of ids) {
    try {
      await submit(id);
      succeeded.push(id);
    } catch {
      failed.push(id);
    }
    onProgress({ completed: succeeded.length + failed.length, total: ids.length });
  }
  return { succeeded, failed };
}
```

- [ ] **Step 4: Run the module test and verify success**

Run:

```bash
cd webapp && npm test -- src/features/job-cards/job-application-selection.test.ts
```

Expected: PASS.

### Task 2: Mode-specific Browse Jobs selection UI

**Files:**
- Modify: `webapp/src/pages/browse-jobs.tsx`
- Modify: `webapp/src/pages/browse-jobs-layout.test.ts`

- [ ] **Step 1: Add failing source assertions**

Require:

```ts
expect(source).toContain("const selectionMode = applicationSelectionMode(filters.applicationMethods)");
expect(source).toContain("selectionMode === 'quick_apply' ? 'Select' : 'Auto-apply'");
expect(source).toContain('setSelected(new Set())');
expect(source).toContain('Quick Apply selected');
expect(source).toContain('runQuickApplyBatch');
```

Assert Auto-Apply enqueue is guarded:

```ts
expect(source).toContain("adding && selectionMode === 'auto_apply' && activeProfileId");
```

- [ ] **Step 2: Run the layout test and verify failure**

Run:

```bash
cd webapp && npm test -- src/pages/browse-jobs-layout.test.ts
```

Expected: FAIL because every card currently renders Auto-Apply and every selection can enqueue.

- [ ] **Step 3: Implement mode-aware selection**

Import the new module. Derive:

```ts
const selectionMode = applicationSelectionMode(filters.applicationMethods);
```

Guard queueing:

```ts
if (adding && selectionMode === 'auto_apply' && activeProfileId) {
  void enqueueAutoApply({ profile_id: activeProfileId, job_posting_id: id });
}
```

When application method changes:

```ts
setSelected(new Set());
setBulkResult(null);
setFilters({ ...filters, applicationMethods, page: 1 });
```

Render the checkbox label with:

```tsx
{selectionMode === 'quick_apply' ? 'Select' : 'Auto-apply'}
```

Update toolbar guidance so Apply mode describes the Auto-Apply bucket and Quick Apply mode describes bulk selection.

- [ ] **Step 4: Implement bulk action and progress**

Add bulk state:

```ts
const [bulkProgress, setBulkProgress] = useState<{ completed: number; total: number } | null>(null);
const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number } | null>(null);
```

For selected Quick Apply jobs, call `runQuickApplyBatch`. Each submit invokes `quickApplyToJobPosting`, records the application, and never opens a new tab. Merge successful IDs into `applied`, remove only successful IDs from `selected`, and retain failures.

Render a toolbar button labelled `Quick Apply selected`, changing to `Applying completed/total…` while running. Render the final success/failure summary beside it.

- [ ] **Step 5: Run the layout test and verify success**

Run:

```bash
cd webapp && npm test -- src/pages/browse-jobs-layout.test.ts
```

Expected: PASS.

### Task 3: Regression and live verification

**Files:**
- Modify only files above if verification reveals a scoped defect.

- [ ] **Step 1: Run all tests**

Run:

```bash
cd webapp && npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run build and lint**

Run:

```bash
cd webapp && npm run build
cd webapp && npm run lint
```

Expected: build succeeds; lint has no errors. Existing Fast Refresh warnings may remain.

- [ ] **Step 3: Verify Apply mode in the browser**

- Confirm cards say `Auto-apply`.
- Confirm selecting a card enqueues it.
- Confirm select-all applies only to the visible Apply page.

- [ ] **Step 4: Verify Quick Apply mode in the browser**

- Confirm cards say `Select`, never `Auto-apply`.
- Confirm selection does not change the Auto-Apply queue.
- Confirm selection count and `Quick Apply selected` action appear.
- Confirm switching methods clears selection.
- Confirm bulk progress and result summary render without opening tabs.
