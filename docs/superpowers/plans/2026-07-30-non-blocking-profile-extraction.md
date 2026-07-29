# Non-Blocking Profile Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make profile upload, resume reading, and fact extraction backend-owned and observable so users can navigate freely while consistent progress appears on the creation screen, Profiles page, and global profile selector.

**Architecture:** Persist the current stage and heartbeat on the existing `operations` table, process committed pending work through a small backend worker loop with its own database sessions, and expose the latest operation in every profile response. The web app observes profile state through React Query, preserves the existing ready active profile, and renders shared processing/failure states without relying on component-local memory.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, PostgreSQL, Pydantic, React 19, TypeScript, TanStack Query, Zod, Vitest, Testing Library.

---

## File Structure

- `backend/migrations/versions/0014_add_operation_stage_heartbeat.py`: persist operation stage and heartbeat.
- `backend/app/db/entities.py`: add `OperationStage`, `stage`, and `heartbeat_at`.
- `backend/app/models/profile.py`: add the normalized processing summary to profile responses.
- `backend/app/operations/service.py`: enforce one active extraction, update stages/heartbeats, fail stale work, and serialize summaries.
- `backend/app/documents/service.py`: split reading and extraction stage transitions and make failures terminal.
- `backend/app/documents/worker.py`: claim and run committed parse operations with independent sessions.
- `backend/app/api/documents.py`: enqueue processing through persistence and reject concurrent extraction.
- `backend/app/main.py`: start and stop the document-processing worker loop.
- `backend/app/profiles/service.py`: attach latest operation summaries and protect incomplete profiles.
- `backend/tests/test_profile_processing_lifecycle.py`: backend lifecycle and concurrency coverage.
- `webapp/src/schemas/backend.ts`: processing-summary schema.
- `webapp/src/api/documents.ts`: remove browser-owned execute call; add retry call.
- `webapp/src/features/profile-processing/profile-processing.ts`: shared status labels and predicates.
- `webapp/src/features/profile-processing/profile-processing.test.ts`: pure state tests.
- `webapp/src/features/profile-processing/profile-processing-card.tsx`: reusable processing/failure presentation.
- `webapp/src/features/profile-switcher/profile-switcher.tsx`: global processing and failure indicators.
- `webapp/src/features/profile-switcher/profile-switcher.test.tsx`: dropdown lifecycle coverage.
- `webapp/src/pages/documents.tsx`: in-place creation progress, profile-grid states, retry, and single-operation UI restriction.
- `webapp/src/pages/profile-processing.test.tsx`: creation and profile-grid lifecycle coverage.
- `webapp/src/lib/parsing-state.ts`: delete after all consumers move to backend state.

### Task 1: Persist Operation Stages and Heartbeats

**Files:**
- Create: `backend/migrations/versions/0014_add_operation_stage_heartbeat.py`
- Modify: `backend/app/db/entities.py`
- Test: `backend/tests/test_profile_processing_lifecycle.py`

- [ ] **Step 1: Write the failing entity test**

Create a database-backed test that inserts a parse operation with:

```python
operation = Operation(
    profile_id=profile.id,
    operation_type="parse_document",
    status=OperationStatus.running,
    stage=OperationStage.reading,
    progress=10,
    payload={},
    heartbeat_at=now,
)
session.add(operation)
session.flush()
assert operation.stage is OperationStage.reading
assert operation.heartbeat_at == now
```

- [ ] **Step 2: Run the test and confirm the schema is missing**

Run:

```bash
docker compose exec -T api pytest tests/test_profile_processing_lifecycle.py -q
```

Expected: failure because `OperationStage`, `stage`, and `heartbeat_at` do not exist.

- [ ] **Step 3: Add the operation stage model**

Add:

```python
class OperationStage(str, enum.Enum):
    uploading = "uploading"
    reading = "reading"
    extracting = "extracting"
    complete = "complete"
    failed = "failed"
```

Add nullable `stage` and timezone-aware nullable `heartbeat_at` columns to
`Operation`. The migration must create the enum, add both columns, backfill
existing succeeded/failed operations to `complete`/`failed`, and leave unrelated
operation types nullable. Add a partial unique index that permits only one
`parse_document` operation whose status is pending or running; removing this
entitlement later requires dropping only that index.

- [ ] **Step 4: Apply the migration and rerun the test**

Run:

```bash
docker compose exec -T api alembic upgrade head
docker compose exec -T api pytest tests/test_profile_processing_lifecycle.py -q
```

Expected: passing entity test.

### Task 2: Add Durable Lifecycle Services and Concurrency Enforcement

**Files:**
- Modify: `backend/app/operations/service.py`
- Modify: `backend/app/models/profile.py`
- Modify: `backend/app/profiles/service.py`
- Test: `backend/tests/test_profile_processing_lifecycle.py`

- [ ] **Step 1: Write failing service tests**

Cover these exact behaviors:

```python
assert lifecycle.latest_for_profile(profile.id).stage == "reading"
assert lifecycle.active_profile_ids() == {profile.id}
with pytest.raises(DomainError) as error:
    lifecycle.require_extraction_slot(other_profile.id)
assert error.value.code == "PROFILE_EXTRACTION_IN_PROGRESS"
```

Also create a running operation with `heartbeat_at=now - timedelta(minutes=16)`,
call `expire_stale()`, and assert it becomes failed with
`error_code == "PROCESSING_INTERRUPTED"`.

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
docker compose exec -T api pytest tests/test_profile_processing_lifecycle.py -q
```

Expected: failures for missing lifecycle methods and profile response fields.

- [ ] **Step 3: Implement the normalized summary**

Add this Pydantic shape:

```python
class ProfileProcessing(ApiModel):
    operation_id: str
    source_document_id: str | None
    status: Literal["pending", "running", "succeeded", "failed"]
    stage: Literal["uploading", "reading", "extracting", "complete", "failed"]
    error_code: str | None
    retryable: bool
    started_at: datetime | None
    completed_at: datetime | None
```

Add `processing: ProfileProcessing | None` to `ProfileResponse`.
`ProfileService._response()` must select the newest `parse_document` operation and
serialize it. It must call stale expiration before list/get serialization.

- [ ] **Step 4: Implement lifecycle transitions**

Add methods with these contracts:

```python
require_extraction_slot(profile_id: UUID) -> None
set_stage(operation: Operation, stage: OperationStage) -> None
succeed(operation: Operation) -> None
fail(operation: Operation, error_code: str) -> None
expire_stale(now: datetime | None = None) -> int
```

`require_extraction_slot` locks/query-checks pending or running parse operations
for other profiles and raises HTTP 409 with code
`PROFILE_EXTRACTION_IN_PROGRESS`. Every stage transition updates
`heartbeat_at`. Stale means no heartbeat for 15 minutes.

- [ ] **Step 5: Run lifecycle tests**

Run:

```bash
docker compose exec -T api pytest tests/test_profile_processing_lifecycle.py -q
```

Expected: all lifecycle and concurrency tests pass.

### Task 3: Move Processing Into a Durable Worker

**Files:**
- Create: `backend/app/documents/worker.py`
- Modify: `backend/app/documents/service.py`
- Modify: `backend/app/api/documents.py`
- Modify: `backend/app/api/source_preview.py`
- Modify: `backend/app/api/operations.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_profile_processing_lifecycle.py`

- [ ] **Step 1: Write failing background-processing tests**

Use a fake parser and extractor to verify:

```python
response = client.post(f"/profiles/{profile_id}/documents", files=resume)
assert response.status_code == 202
assert response.json()["status"] == "pending"
run_document_worker_once(fake_parser)
profile = client.get(f"/profiles/{profile_id}").json()
assert profile["processing"]["stage"] == "complete"
```

Add a failure test where the parser raises and assert operation status `failed`,
stage `failed`, profile readiness `parse_failed`, and retryable true.

- [ ] **Step 2: Run the tests and verify the browser-owned flow fails**

Run:

```bash
docker compose exec -T api pytest tests/test_profile_processing_lifecycle.py -q
```

Expected: failure because the durable worker does not exist.

- [ ] **Step 3: Add the independent worker**

Implement:

```python
def run_document_worker_once(parser: DocumentParser) -> bool:
    with get_session_factory()() as session, session.begin():
        operation_id = OperationService(session).claim_next_parse_operation()
    if operation_id is None:
        return False
    with get_session_factory()() as session, session.begin():
        try:
            DocumentProcessingService(
                session=session,
                storage=FilesystemStorage(get_settings().storage_root),
                parser=parser,
            ).process(operation_id)
        except Exception as error:
            OperationService(session).fail_by_id(
                operation_id,
                safe_processing_error(error),
            )
            logger.exception("profile_processing_failed", extra={"operation_id": str(operation_id)})
    return True
```

`claim_next_parse_operation()` uses `SELECT ... FOR UPDATE SKIP LOCKED` and marks
the claimed operation running before returning its ID. The worker owns and
commits its sessions. Technical errors stay in logs; only safe codes are
persisted.

Change `DocumentProcessingService.process()` to require an already-running
claimed operation instead of calling `require_pending()` and starting it again.
The compatibility execute endpoint first claims its specified pending operation,
then invokes the same processing method.

- [ ] **Step 4: Start the worker from application lifespan**

Add a loop analogous to the ATS sync loop:

```python
async def _document_worker_loop(parser: DocumentParser) -> None:
    while True:
        worked = await asyncio.to_thread(run_document_worker_once, parser)
        await asyncio.sleep(0 if worked else 1)
```

Start it after `document_parser` initialization and cancel it during lifespan
shutdown. Upload and reprocess endpoints only create committed pending
operations. Call `require_extraction_slot()` before persisting either operation.
Keep the old execute endpoint for compatibility, but route it through the same
claim/process service and reject already-claimed operations cleanly.

- [ ] **Step 5: Mark real stage boundaries**

Immediately before Docling parsing set `reading`; immediately after Docling
returns and before fact extraction set `extracting`; on completion set
`complete`. On any exception set profile status failed, readiness
`parse_failed`, document failed, and operation failed.

- [ ] **Step 6: Run backend tests**

Run:

```bash
docker compose exec -T api pytest tests/test_profile_processing_lifecycle.py -q
docker compose exec -T api pytest tests -q
```

Expected: lifecycle tests and the complete backend suite pass.

### Task 4: Model Processing State in the Web App

**Files:**
- Modify: `webapp/src/schemas/backend.ts`
- Modify: `webapp/src/api/documents.ts`
- Create: `webapp/src/features/profile-processing/profile-processing.ts`
- Create: `webapp/src/features/profile-processing/profile-processing.test.ts`

- [ ] **Step 1: Write failing pure-state tests**

Test:

```typescript
expect(profileStageLabel({ stage: 'reading' })).toBe('Reading résumé…');
expect(isProfileSelectable(processingProfile)).toBe(false);
expect(isProfileSelectable(readyProfile)).toBe(true);
expect(activeProcessingCount(profiles)).toBe(1);
expect(hasExtractionSlot(profiles)).toBe(false);
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
npm test -- --run src/features/profile-processing/profile-processing.test.ts
```

Expected: failure because the processing module does not exist.

- [ ] **Step 3: Add schemas and helpers**

Add a Zod `profileProcessingSchema` matching the backend response and append
`processing: profileProcessingSchema.nullable().default(null)` to
`backendProfileSchema`.

Implement pure helpers for labels, terminal/active detection, selectability,
active count, failure detection, and extraction-slot availability. A profile is
selectable only when no active/failed processing exists and its readiness is
`needs_review` or `ready`.

- [ ] **Step 4: Remove browser-owned execution**

Delete `executeParse()` and its schema import. Upload now means “accepted and
scheduled.” Add:

```typescript
export function retryProfileExtraction(documentId: string) {
  return apiRequest(
    `/documents/${documentId}/reprocess`,
    documentReprocessSchema,
    { method: 'POST' },
  );
}
```

- [ ] **Step 5: Run focused tests and type-check**

Run:

```bash
npm test -- --run src/features/profile-processing/profile-processing.test.ts
npm run build
```

Expected: tests and TypeScript build pass.

### Task 5: Add Header Processing and Failure States

**Files:**
- Modify: `webapp/src/features/profile-switcher/profile-switcher.tsx`
- Modify: `webapp/src/features/profile-switcher/profile-switcher-state.ts`
- Modify: `webapp/src/features/profile-switcher/profile-switcher.test.tsx`

- [ ] **Step 1: Write failing dropdown tests**

Render one ready active profile and one reading profile. Assert:

```typescript
expect(screen.getByRole('button', { name: /engineering manager.*1 processing/i })).toBeTruthy();
fireEvent.click(screen.getByRole('button', { name: /engineering manager.*1 processing/i }));
expect(screen.getByRole('option', { name: /staff engineer.*reading résumé/i }))
  .toHaveProperty('ariaDisabled', 'true');
```

Add completion acknowledgement, failed attention state, and no-ready-profile
tests. Selecting an incomplete profile must not invoke `onSelect`.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- --run src/features/profile-switcher/profile-switcher.test.tsx
```

Expected: missing processing labels and disabled dropdown entries.

- [ ] **Step 3: Implement integrated Option A**

Use the existing selector button. Add amber dot plus “1 processing,” show each
incomplete entry with its stage, and use `aria-disabled="true"`. Failed entries
show “Needs attention” and route to `/profile?manage=1&focus=<profile-id>`.
Expose status changes in a visually hidden `aria-live="polite"` region.

Do not replace the active ready profile. If there is no ready profile, render a
status-only trigger and do not persist the incomplete ID as active.

- [ ] **Step 4: Run header tests**

Run:

```bash
npm test -- --run src/features/profile-switcher/profile-switcher.test.tsx
```

Expected: all header lifecycle tests pass.

### Task 6: Keep Creation In Place and Add Profile Cards

**Files:**
- Create: `webapp/src/features/profile-processing/profile-processing-card.tsx`
- Modify: `webapp/src/pages/documents.tsx`
- Create: `webapp/src/pages/profile-processing.test.tsx`
- Delete: `webapp/src/lib/parsing-state.ts`

- [ ] **Step 1: Write failing creation-flow tests**

Mock create and upload so submission returns an operation. Assert that the
creation screen changes in place to:

```typescript
expect(screen.getByText('Reading résumé…')).toBeTruthy();
expect(screen.getByText('Safe to leave this page')).toBeTruthy();
expect(mockNavigate).not.toHaveBeenCalled();
```

Rerender the query as complete and assert the completed profile view opens.
Test that a refresh with `?creating=<profile-id>` reconstructs the processing
view.

- [ ] **Step 2: Write failing profile-grid tests**

Assert an active processing profile has an amber card, indeterminate progress,
disabled rename/delete/default/open actions, and that “New profile” remains
visible but disabled. Assert failed cards expose only “Try again” and “Delete.”

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm test -- --run src/pages/profile-processing.test.tsx
```

Expected: failures because the current onboarding navigates and uses memory state.

- [ ] **Step 4: Implement the in-place processing route state**

After profile creation, replace the URL with
`/profile?creating=<profile-id>` and keep rendering `Onboarding`. After upload,
invalidate `['profiles']` and poll it every 1500 ms while processing is active.
The form becomes `ProfileProcessingCard`; it does not call
`setActiveProfileId()` when another ready profile exists.

When the first profile completes, persist it as active and navigate to the clean
`/profile` detail URL. When a later profile completes, show its detail in place
without changing the globally active profile; leaving the page preserves the
previous active selection.

- [ ] **Step 5: Implement grid and retry states**

Use the same `ProfileProcessingCard` in the grid. Apply amber reading/extraction
and restrained red failure treatments. Disable the New Profile card when
`hasExtractionSlot(profiles)` is false and include the explanatory description.
Retry uses the latest source document through the backend retry endpoint.

- [ ] **Step 6: Remove in-memory parsing state**

Remove all imports and usages of `markParsing`, `clearParsing`, and
`useIsParsing`, then delete `webapp/src/lib/parsing-state.ts`. Profile detail
polling must depend on backend `processing` state.

- [ ] **Step 7: Run profile UI tests**

Run:

```bash
npm test -- --run src/pages/profile-processing.test.tsx
npm test -- --run src/features/profile-switcher/profile-switcher.test.tsx
```

Expected: all lifecycle UI tests pass.

### Task 7: Full Verification and Live Navigation Audit

**Files:**
- Modify only files required by failures found during verification.

- [ ] **Step 1: Run all automated checks**

Run:

```bash
docker compose exec -T api pytest tests -q
cd webapp && npm test -- --run
cd webapp && npm run build
cd webapp && npm run lint
git diff --check
```

Expected: backend and frontend tests pass, production build succeeds, lint has no
new warnings, and diff check is clean.

- [ ] **Step 2: Perform the live first-profile flow**

Create the first profile, remain on the creation processing screen, navigate to
Browse Jobs, confirm the header shows processing without enabling
profile-dependent actions, refresh, return to the processing profile, and verify
automatic active/default selection only after success.

- [ ] **Step 3: Perform the live second-profile flow**

With a ready profile active, create another profile and verify:

- the ready profile remains active;
- the creation screen does not redirect;
- the header shows “1 processing” on every page;
- the processing dropdown entry is disabled;
- the Profiles page shows an amber card;
- New Profile is disabled;
- completion does not switch the active profile.

- [ ] **Step 4: Perform failure and recovery audit**

Use an invalid supported-format fixture or controlled parser failure. Verify the
red card, attention indicator, retry, delete, and slot release. Create a stale
operation fixture and verify it becomes interrupted after lifecycle refresh.

- [ ] **Step 5: Report evidence**

Record exact test totals, build result, lint warnings, and live flows verified.
Do not claim stale-operation or failure behavior unless it was actually exercised.
