# Data-Driven Job Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static Browse Jobs controls with server-backed facets, complete structured and enriched job filters, candidate-aware state filters, and full-result sorting.

**Architecture:** Extend ATS normalization and `job_postings` persistence with trustworthy structured source fields, derive deterministic enrichment with evidence, and expose one typed filter contract shared by the list and facet endpoints. Keep URL query state and controls in focused webapp modules; all filtering, sorting, counts, and pagination execute in PostgreSQL.

**Tech Stack:** FastAPI, Pydantic, SQLAlchemy, PostgreSQL, Alembic, Python `unittest`, React 19, TypeScript, TanStack Query, Zod, Vitest.

---

### Task 1: Establish test harnesses and filter vocabulary

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `webapp/package.json`
- Modify: `webapp/package-lock.json`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_job_normalization.py`
- Create: `webapp/src/features/job-filters/job-filter-state.test.ts`
- Create: `webapp/src/features/job-filters/job-filter-state.ts`

- [ ] **Step 1: Write failing normalization tests**

Test canonical employment, workplace, role, and seniority values, including
unknown fallbacks and conservative title/location inference.

- [ ] **Step 2: Run tests and verify RED**

Run: `docker compose exec -T api python -m unittest tests.test_job_normalization -v`

Expected: import failure because `app.ats.normalization` does not exist.

- [ ] **Step 3: Add Vitest and write failing URL-state tests**

Add `test: "vitest run"` plus Vitest, jsdom, Testing Library React, and
user-event dev dependencies. Test parsing/serialization of repeated facets,
keywords, exclusions, dates, numeric ranges, profile filters, and sort.

- [ ] **Step 4: Run tests and verify RED**

Run: `cd webapp && npm test -- job-filter-state.test.ts`

Expected: import failure because the query-state implementation does not exist.

- [ ] **Step 5: Implement minimal vocabulary and URL state**

Create enums/constants and pure parsing/serialization functions with safe
defaults. Invalid individual URL values are ignored.

- [ ] **Step 6: Run both focused suites and verify GREEN**

- [ ] **Step 7: Commit**

```bash
git add backend/requirements.txt backend/tests webapp/package.json webapp/package-lock.json webapp/src/features/job-filters
git commit -m "test: establish job filter contracts"
```

### Task 2: Persist structured ATS fields

**Files:**
- Modify: `backend/app/ats/base.py`
- Modify: `backend/app/ats/lever.py`
- Modify: `backend/app/ats/greenhouse.py`
- Modify: `backend/app/ats/ashby.py`
- Modify: `backend/app/ats/smartrecruiters.py`
- Create: `backend/app/ats/normalization.py`
- Modify: `backend/app/ats/sync_service.py`
- Modify: `backend/app/db/entities.py`
- Create: `backend/migrations/versions/0011_add_job_filter_fields.py`
- Modify: `backend/tests/test_job_normalization.py`

- [ ] **Step 1: Expand failing connector tests**

Assert native department, description, workplace type, employment type,
experience level, language, and source fingerprint normalization for all four
connectors.

- [ ] **Step 2: Run connector tests and verify RED**

- [ ] **Step 3: Extend `NormalizedPosting` and connectors**

Retain plain description, source HTML, department, native workplace/employment
values, language, and fingerprint. Normalize structured filter columns.

- [ ] **Step 4: Add nullable columns and indexes**

Add `description_text`, `description_html`, `source_language`,
`source_department`, `workplace_type`, `employment_type`, `role_category`,
`experience_level`, and `source_fingerprint`.

- [ ] **Step 5: Update synchronization**

Create/update the new fields without changing deactivation behavior.

- [ ] **Step 6: Run normalization tests, migration upgrade, and schema validation**

- [ ] **Step 7: Commit**

```bash
git add backend/app/ats backend/app/db/entities.py backend/migrations/versions/0011_add_job_filter_fields.py backend/tests
git commit -m "feat: normalize structured job attributes"
```

### Task 3: Implement the complete backend filter contract

**Files:**
- Create: `backend/tests/test_job_posting_query.py`
- Modify: `backend/app/models/job_posting.py`
- Modify: `backend/app/api/job_postings.py`
- Modify: `backend/app/ats/query_service.py`
- Modify: `backend/app/scoring/agent_pipeline.py`

- [ ] **Step 1: Write failing query-service tests**

Use an in-memory SQLite session with job fixtures. Cover include-token AND,
excluded-term ANY, date bounds, repeated facet OR, cross-facet AND, application
method, source, null behavior, and every Phase A sort.

- [ ] **Step 2: Run and verify RED against the old service signature**

- [ ] **Step 3: Add a typed `JobPostingFilters` model**

Represent keywords, date bounds, list facets, enrichment values, candidate
values, unknown inclusion, and sort in one immutable service contract.

- [ ] **Step 4: Implement SQL filtering and sorting**

Build composable SQLAlchemy conditions. Apply sorting before offset/limit and
calculate total from the same conditions.

- [ ] **Step 5: Map validated FastAPI query parameters**

Use repeated query parameters for multi-select facets and return stable 422
errors for invalid ranges.

- [ ] **Step 6: Run tests and verify GREEN**

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/job_posting.py backend/app/api/job_postings.py backend/app/ats/query_service.py backend/tests/test_job_posting_query.py
git commit -m "feat: add server-side job filtering and sorting"
```

### Task 4: Add data-driven facet counts

**Files:**
- Create: `backend/tests/test_job_posting_facets.py`
- Modify: `backend/app/models/job_posting.py`
- Modify: `backend/app/api/job_postings.py`
- Modify: `backend/app/ats/query_service.py`

- [ ] **Step 1: Write failing facet tests**

Verify real values and counts, selected zero-count options, and self-excluding
facet counts under other active filters.

- [ ] **Step 2: Run and verify RED**

- [ ] **Step 3: Implement facet models and `GET /job-postings/facets`**

Return stable keys with `{value,label,count}` options for company, location,
workplace, role, employment, experience, application method, and source.

- [ ] **Step 4: Run and verify GREEN**

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/job_posting.py backend/app/api/job_postings.py backend/app/ats/query_service.py backend/tests/test_job_posting_facets.py
git commit -m "feat: expose job filter facets"
```

### Task 5: Add evidence-backed description enrichment

**Files:**
- Create: `backend/tests/test_job_enrichment.py`
- Create: `backend/app/ats/enrichment.py`
- Modify: `backend/app/db/entities.py`
- Create: `backend/migrations/versions/0012_add_job_enrichment.py`
- Modify: `backend/app/ats/sync_service.py`
- Modify: `backend/app/models/job_posting.py`
- Modify: `backend/app/ats/query_service.py`

- [ ] **Step 1: Write failing deterministic extraction tests**

Use fixtures covering years, degree/equivalent experience, explicit sponsorship,
salary/currency/period, required/preferred skills, language, industry, travel,
and unknown cases. Assert evidence text is present in the source.

- [ ] **Step 2: Run and verify RED**

- [ ] **Step 3: Implement conservative enrichment**

Extract only explicit facts. Store normalized scalar values and a JSON evidence
array containing attribute, value, confidence, excerpt, method, and version.

- [ ] **Step 4: Add enrichment columns and migration**

Persist experience bounds/bucket, degree, sponsorship, salary bounds/currency/
period, skills, languages, industry, travel, evidence, and extractor version.

- [ ] **Step 5: Enrich on source-fingerprint change**

Run enrichment during sync only for new/changed descriptions or extractor
version changes.

- [ ] **Step 6: Add Phase B filters and salary sorting**

- [ ] **Step 7: Run tests, migrations, and verification**

- [ ] **Step 8: Commit**

```bash
git add backend/app/ats backend/app/db/entities.py backend/app/models/job_posting.py backend/migrations/versions/0012_add_job_enrichment.py backend/tests
git commit -m "feat: enrich job requirements with evidence"
```

### Task 6: Persist candidate job state and score snapshots

**Files:**
- Create: `backend/tests/test_candidate_job_filters.py`
- Modify: `backend/app/db/entities.py`
- Create: `backend/migrations/versions/0013_add_candidate_job_state.py`
- Modify: `backend/app/models/job_posting.py`
- Modify: `backend/app/api/job_postings.py`
- Modify: `backend/app/ats/query_service.py`

- [ ] **Step 1: Write failing per-profile state tests**

Cover saved, dismissed, applied, analyzed, match level, minimum score, missing
critical skills, Auto-Apply eligibility, profile isolation, and null scores.

- [ ] **Step 2: Run and verify RED**

- [ ] **Step 3: Add `candidate_job_states`**

Persist profile/job keys, saved/dismissed flags, match score/level, missing
critical-skill count, scoring version, job fingerprint, and profile revision.

- [ ] **Step 4: Add state mutation endpoint**

Expose an idempotent PATCH for saved and dismissed state. Never allow both.

- [ ] **Step 5: Add candidate filters and best-match sorting**

Require `profile_id` when a candidate filter or match sort is used.

- [ ] **Step 6: Persist successful scoring results**

Upsert the profile/job score snapshot when scoring a retained job posting, with
the current job fingerprint, scoring version, match level, and critical gaps.

- [ ] **Step 7: Run tests and migrations**

- [ ] **Step 8: Commit**

```bash
git add backend/app/db/entities.py backend/app/models/job_posting.py backend/app/api/job_postings.py backend/app/ats/query_service.py backend/app/scoring/agent_pipeline.py backend/migrations/versions/0013_add_candidate_job_state.py backend/tests
git commit -m "feat: add candidate-aware job filters"
```

### Task 7: Build the typed webapp API and query state

**Files:**
- Modify: `webapp/src/schemas/job-posting.ts`
- Modify: `webapp/src/api/job-postings.ts`
- Modify: `webapp/src/features/job-filters/job-filter-state.ts`
- Create: `webapp/src/api/job-postings.test.ts`
- Modify: `webapp/src/features/job-filters/job-filter-state.test.ts`

- [ ] **Step 1: Write failing request-construction tests**

Assert every filter and sort serializes to the backend contract with repeated
parameters and no blank values.

- [ ] **Step 2: Run and verify RED**

- [ ] **Step 3: Extend Zod schemas and API calls**

Add normalized/enriched job fields, facets, candidate state, list filters, and
state mutation.

- [ ] **Step 4: Complete URL-state round-trip behavior**

- [ ] **Step 5: Run and verify GREEN**

- [ ] **Step 6: Commit**

```bash
git add webapp/src/schemas/job-posting.ts webapp/src/api/job-postings.ts webapp/src/api/job-postings.test.ts webapp/src/features/job-filters
git commit -m "feat: add typed job filter client"
```

### Task 8: Implement search, date, facet, and range controls

**Files:**
- Create: `webapp/src/features/job-filters/job-search-bar.tsx`
- Create: `webapp/src/features/job-filters/date-filter.tsx`
- Create: `webapp/src/features/job-filters/facet-filter.tsx`
- Create: `webapp/src/features/job-filters/range-filter.tsx`
- Create: `webapp/src/features/job-filters/all-filters-sheet.tsx`
- Create: `webapp/src/features/job-filters/job-filter-bar.tsx`
- Create: `webapp/src/features/job-filters/job-filter-bar.test.tsx`
- Modify: `webapp/src/pages/browse-jobs.tsx`

- [ ] **Step 1: Write failing interaction tests**

Cover debounced typing, Enter, include/exclude chips, Backspace, date preset and
custom bounds, multi-select, ranges, active count, Clear all, page reset, and
profile-disabled controls.

- [ ] **Step 2: Run and verify RED**

- [ ] **Step 3: Implement focused accessible controls**

Use existing Popover, Command, and Sheet primitives. Preserve focus, keyboard
operation, labels, and mobile behavior.

- [ ] **Step 4: Replace static filter chips**

Drive list and facet queries from URL-backed state. Remove page-local filtering
and sorting.

- [ ] **Step 5: Run and verify GREEN**

- [ ] **Step 6: Commit**

```bash
git add webapp/src/features/job-filters webapp/src/pages/browse-jobs.tsx
git commit -m "feat: build interactive job filters"
```

### Task 9: Integrate candidate actions and enrichment evidence

**Files:**
- Modify: `webapp/src/pages/browse-jobs.tsx`
- Create: `webapp/src/features/job-filters/enrichment-summary.tsx`
- Create: `webapp/src/features/job-filters/candidate-job-actions.tsx`
- Create: `webapp/src/features/job-filters/candidate-job-actions.test.tsx`

- [ ] **Step 1: Write failing behavior tests**

Verify save/dismiss mutations, profile gating, unknown enrichment labels,
evidence display, and match sort/filter availability.

- [ ] **Step 2: Run and verify RED**

- [ ] **Step 3: Implement candidate actions and evidence UI**

Keep application actions user-controlled and separate from save/dismiss.

- [ ] **Step 4: Run and verify GREEN**

- [ ] **Step 5: Commit**

```bash
git add webapp/src/features/job-filters webapp/src/pages/browse-jobs.tsx
git commit -m "feat: add candidate-aware job discovery"
```

### Task 10: Verify the complete initiative

**Files:**
- Modify: `README.md`
- Create: `docs/manual-testing/job-filters-checklist.md`

- [ ] **Step 1: Run all backend tests**

Run: `docker compose exec -T api python -m unittest discover -s tests -v`

Expected: all tests pass.

- [ ] **Step 2: Validate migrations and backend configuration**

Run:

```bash
docker compose exec -T api alembic upgrade head
docker compose exec -T api python scripts/validate_config.py
docker compose exec -T api python scripts/validate_migrations.py
```

- [ ] **Step 3: Run webapp tests, lint, and build**

Run:

```bash
cd webapp
npm test
npm run lint
npm run build
```

- [ ] **Step 4: Smoke-test list, facets, and combined queries**

Verify HTTP 200, stable schemas, accurate totals, and profile validation.

- [ ] **Step 5: Complete browser acceptance checklist**

Check search, every filter group, every sort, URL refresh, mobile Sheet,
keyboard navigation, empty state, and Clear all against the live backend.

- [ ] **Step 6: Commit documentation**

```bash
git add README.md docs/manual-testing/job-filters-checklist.md
git commit -m "docs: document job filter verification"
```
