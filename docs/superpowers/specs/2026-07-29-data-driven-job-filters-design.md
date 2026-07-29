# Data-Driven Browse Jobs Filters Design

**Date:** 2026-07-29

**Status:** Approved for implementation planning

## Goal

Replace the Browse Jobs page's static filter chips and page-local search behavior
with a complete, evidence-backed filtering system covering job attributes,
description-derived requirements, and candidate-specific job state.

The completed initiative supports all 23 approved filter groups and backend
sorting. A filter is enabled only when its value comes from structured ATS data,
deterministic extraction, evidence-backed enrichment, or persisted user/profile
state. Unknown values remain unknown; the system does not invent classifications.

## Delivery Strategy

The initiative is delivered in three independently usable phases:

1. **Structured job filters:** filters backed by current ATS and posting fields.
2. **Job-description enrichment:** filters derived from retained job descriptions.
3. **Candidate-aware filters:** filters backed by profile scoring and user actions.

Each phase includes its database, API, frontend, migration, and verification work.
The Browse Jobs API remains backward compatible while new query parameters are
introduced.

## Current-State Problems

- The frontend displays nine filter chips that only toggle their appearance.
- Search is submitted only after turning text into chips, making ordinary typing
  appear broken.
- Exclusion and sorting operate only on the current page of 24 results.
- Client-side filtering makes displayed counts and pagination inaccurate.
- The backend accepts only a broad `search` value and always sorts newest first.
- The database retains only vendor, company, title, team, location, commitment,
  URLs, posting date, and activity state.
- Degree, experience, visa, salary, skills, language, industry, and travel values
  do not yet have a trustworthy persisted source.
- Candidate-specific filters require joins to scoring and application state and
  cannot be treated as static job attributes.

## Design Principles

1. Filtering, exclusion, sorting, facet counting, and pagination happen in the
   backend against the full result set.
2. Facet options come from actual persisted values rather than hard-coded lists.
3. Normalization retains the original source value for audit and display.
4. Inferred attributes store confidence, evidence, and extractor version.
5. Unsupported or missing information is represented as `unknown`, never as a
   negative claim.
6. Candidate-specific filters require an explicit active profile.
7. Query state is serializable in the URL so searches can be refreshed, shared,
   and revisited.
8. Multi-select values within one facet use OR; different facets use AND.
9. Search and exclusion behavior is deterministic and documented.
10. Existing application safeguards remain unchanged: the user controls any
    application action and the system never clicks a final submit control.

## Phase A: Structured Job Filters

### Supported Filters

1. **Include keywords**
   - Searches title, company, team/category, location, and retained description
     text when available.
   - Multiple keyword tokens use AND semantics.
   - Quoted phrases match as phrases.

2. **Exclude keywords**
   - Uses the same searchable fields.
   - A result is excluded when any excluded term matches.

3. **Date posted**
   - Any time, past 24 hours, past 3 days, past week, past 2 weeks, past month,
     or an inclusive custom `from`/`to` range.
   - Presets are translated to UTC instants by the backend.
   - Custom dates are entered in the user's local calendar and sent as ISO dates.
   - Jobs with no posting date appear only under Any time.

4. **Location**
   - Searchable multi-select using normalized values present in active postings.
   - The original location string remains available on job cards.

5. **Workplace type**
   - `remote`, `hybrid`, `on_site`, and `unknown`.
   - Native ATS fields take priority; conservative location/title inference is
     used only when the source does not provide workplace type.

6. **Company**
   - Searchable multi-select generated from active postings.
   - Canonical comparison is case-insensitive; original display spelling is kept.

7. **Role/category**
   - `engineering`, `product`, `design`, `data`, `quality_testing`,
     `devops_infrastructure`, `security`, `management`, `sales`, `marketing`,
     `customer_success`, `finance`, `people_hr`, `operations`, and `other`.
   - Native department/team is mapped first, followed by deterministic title
     classification.

8. **Employment type**
   - `full_time`, `part_time`, `contract`, `internship`, `temporary`,
     `volunteer`, `other`, and `unknown`.
   - Native ATS employment type/commitment is normalized into this vocabulary.

9. **Experience level**
   - `internship`, `entry`, `associate`, `mid`, `senior`, `lead_staff_principal`,
     `manager`, `director`, `executive`, and `unknown`.
   - Phase A uses conservative title classification. Phase B can replace unknown
     values with evidence from the description.

10. **Application method**
    - `quick_apply`, `company_site`, and `any`.
    - Quick Apply requires both a supported vendor and a usable apply URL.

11. **ATS/source**
    - Values are generated from active vendors, initially Lever, Greenhouse,
      Ashby, and SmartRecruiters.

### Search Interaction

- The main search input behaves like a normal controlled search field.
- Search executes after a short debounce and immediately on Enter or Search.
- Commas or Enter can still create explicit keyword chips for advanced queries.
- Backspace removes the last chip only when the text input is empty.
- Excluded terms use the same interaction model in a dedicated control.
- A single Clear all action resets keywords, exclusions, facets, sort, and page.
- Changing any query input resets pagination to page one.
- The current request remains visible while a replacement request loads.
- The page announces the full backend result count and active-filter count.

### Facets

`GET /job-postings/facets` accepts the current filter query and returns:

- company
- location
- workplace type
- role/category
- employment type
- experience level
- application method
- vendor

Every option includes a stable value, display label, and matching result count.
For a facet currently being edited, counts are calculated with that facet omitted
but all other active constraints retained. This allows users to see useful
alternative values without clearing the current facet.

### Sorting

Phase A supports:

- newest
- oldest
- company ascending
- company descending

Sort is applied before pagination. Null posting dates sort last in both date
directions.

## Phase B: Job-Description Enrichment

### Retained Source Data

Job ingestion stores:

- plain-text description
- sanitized source HTML when available
- source language when available
- source department and team
- native workplace and employment values
- source payload revision or retrieval timestamp

The sync pipeline updates enrichment only when relevant source content changes or
the extractor version changes.

### Enrichment Record

Description-derived attributes are stored separately from the source posting.
Each extracted assertion contains:

- normalized attribute name
- normalized value
- confidence
- evidence excerpt
- evidence character offsets where available
- extraction method (`structured`, `deterministic`, or `ai`)
- extractor version
- extraction timestamp

AI output is accepted only when its evidence can be found in the retained source.
Unsupported assertions are discarded.

### Supported Filters

12. **Maximum required experience**
    - `none`, `one_to_two`, `three_to_five`, `six_to_eight`, `nine_plus`,
      and `unknown`.
    - Explicit minimum/maximum years are retained in addition to the UI bucket.

13. **Degree requirement**
    - `none_mentioned`, `high_school`, `associate`, `bachelors`, `masters`,
      `doctorate`, `equivalent_experience`, and `unknown`.
    - "No degree mentioned" is distinct from an explicit "no degree required."

14. **Visa sponsorship**
    - `available`, `unavailable`, `work_authorization_required`, and `unknown`.
    - Only explicit source language may classify this facet.

15. **Salary**
    - Minimum, maximum, currency, and period.
    - Filtering supports disclosed-only and user-entered numeric ranges.
    - No cross-currency comparison occurs without an explicit conversion layer.

16. **Skills and technologies**
    - Searchable multi-select of normalized skills with aliases.
    - Required and preferred skills remain distinguishable.

17. **Language requirements**
    - Normalized language and optional proficiency.
    - Description language itself is not treated as a candidate language
      requirement.

18. **Industry/domain**
    - Uses a controlled taxonomy with an `other` and `unknown` state.
    - Native ATS values take priority over evidence-backed classification.

19. **Travel requirement**
    - `none`, `occasional`, `regular`, and `unknown`.
    - Percentage is retained when explicitly stated.

### Phase B Sorting

Adds:

- salary high to low
- salary low to high

Jobs without comparable salary and currency values sort last.

## Phase C: Candidate-Aware Filters

### Profile Requirement

Candidate-aware controls remain visible for discoverability but disabled when no
active profile exists. The UI explains that selecting a profile enables them.

### Supported Filters

20. **Profile-match level**
    - `strong`, `possible`, `stretch`, and `not_analyzed`.
    - Thresholds are defined by the deterministic scoring contract, not by UI
      labels alone.

21. **Minimum match score**
    - Numeric threshold from 0 to 100.
    - Operates on the latest valid score for the active profile and current job
      revision.

22. **Missing required skills**
    - no critical gaps
    - at most one critical gap
    - any
    - not analyzed

23. **Previously handled**
    - hide applied
    - hide dismissed
    - saved only
    - analyzed only
    - Auto-Apply eligible

Saved and dismissed states are explicit persisted user actions. Applied state
comes from tracked applications. Auto-Apply eligibility combines a supported
application method with profile readiness.

### Phase C Sorting

Adds:

- best profile match

Jobs without a valid score sort last.

## API Contract

### List Request

`GET /job-postings` retains `page` and `page_size` and adds:

- `include`
- `exclude`
- `posted_after`
- `posted_before`
- repeated `location`
- repeated `workplace_type`
- repeated `company`
- repeated `role_category`
- repeated `employment_type`
- repeated `experience_level`
- repeated `application_method`
- repeated `vendor`
- Phase B enrichment parameters
- Phase C `profile_id` and candidate-state parameters
- `sort`

Repeated list parameters use OR semantics. Validation rejects impossible date or
numeric ranges with a stable structured error.

### List Response

The existing item fields remain. New normalized and enriched fields are optional
during migration. The response also returns:

- total results
- page and page size
- normalized query summary
- enrichment coverage summary

### Facet Response

Each facet contains:

```json
{
  "key": "employment_type",
  "options": [
    {
      "value": "full_time",
      "label": "Full-time",
      "count": 142
    }
  ]
}
```

## Database Design

### Job Posting Extensions

Add normalized structured columns for:

- source description and language
- source department/team
- workplace type
- employment type
- role category
- experience level
- source content fingerprint

Add indexes for frequently combined filters and posting date. Company and
location facets use normalized comparison values while retaining original text.

### Enrichment Storage

Use a job-enrichment record keyed to the posting and source fingerprint, with
structured scalar fields for common ranges and a related evidence table for
multi-valued or explainable assertions. Skills and languages use normalized
association tables so filtering and facet counts do not depend on JSON scans.

### Candidate State

Persist saved and dismissed job state per profile. Reuse tracked applications
and existing scoring results where their contracts are current. Scores are
invalidated when the job source fingerprint or candidate profile revision
changes.

## Frontend Components

The current large Browse Jobs page is split by responsibility:

- query-state serialization and defaults
- debounced keyword search
- date preset and custom-range picker
- reusable searchable multi-select facet
- numeric range controls
- active-filter summary and Clear all
- job result grid
- backend pagination and sorting
- candidate-filter availability state

Desktop uses anchored popovers. Narrow screens use the existing Sheet primitive
for an All filters panel. Keyboard navigation, visible labels, focus return, and
screen-reader result announcements are required.

## Loading, Empty, and Error States

- Initial loading shows result-card skeletons and disabled facet placeholders.
- Refetching retains current results and displays a non-blocking progress state.
- No-results state summarizes active constraints and offers Clear all.
- Facet failure does not hide already-loaded jobs; the affected control offers
  Retry.
- Enrichment coverage is transparent. Filters can include or exclude unknown
  values where that distinction matters.
- Invalid URL query values are ignored individually and replaced with safe
  defaults rather than breaking the page.

## Verification Strategy

### Backend

- Query-service tests cover every parameter, multi-select OR semantics,
  cross-facet AND semantics, exclusion, null handling, sorting, and pagination.
- Facet tests verify counts under active constraints.
- Migration tests verify upgrade and downgrade shape.
- Normalization tests cover values from Lever, Greenhouse, Ashby, and
  SmartRecruiters.
- Extraction tests use description fixtures and verify evidence grounding.
- Candidate-filter tests use multiple profiles to prove state isolation.

### Frontend

- Pure query-state tests cover URL parsing and serialization.
- API tests verify request parameter construction.
- Component tests cover search debounce, Enter behavior, date ranges, facet
  selection, Clear all, page reset, and disabled profile filters.
- Browser verification covers keyboard operation, narrow-screen filter Sheet,
  empty states, and live backend integration.
- TypeScript build and lint remain required gates.

### End-to-End Acceptance

1. Load Browse Jobs and see facets derived from active database records.
2. Type a normal search query and receive server-filtered results.
3. Combine date, company, location, workplace, role, and employment filters.
4. Observe accurate counts and pagination after each change.
5. Refresh the page and retain the complete query through the URL.
6. Filter on an evidence-backed degree, sponsorship, salary, skill, language,
   industry, or travel value and inspect its evidence.
7. Select a profile and filter by match, score, missing skills, and prior state.
8. Sort the complete result set using every supported sort option.
9. Clear all and return to the unfiltered active-job catalog.

## Out of Scope

- Guessing missing sponsorship, salary, degree, or experience values.
- Geospatial radius search before structured coordinates are available.
- Currency conversion without a separately designed exchange-rate policy.
- Applicant-count and professional-network filters unavailable from the current
  ATS sources.
- Automatic final application submission.

