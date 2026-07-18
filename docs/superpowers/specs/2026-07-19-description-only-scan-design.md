# Description-Only Job Scan Design

## Goal

Reduce Scan to one required job-description input. The Job Analyst derives all job metadata and requirements from that text.

## User experience

Scan displays one Job Description textarea and an Analyze Job button. Title, company, location, and source URL inputs are removed. The button is enabled when the selected profile is ready and the trimmed description contains at least 20 characters.

While analysis runs, the form remains visible and reports progress. On success, the sidebar moves to Match and the header uses the analyst-extracted title and company. Before analysis, the header shows No job selected. Revisiting a completed Scan displays the submitted description read-only.

## API contract

`POST /jobs/analyze` accepts only `profile_id` and `description`. The backend rejects blank or shorter-than-20-character descriptions. `JobAnalystOutput` remains responsible for title, company, location, and evidence-bearing requirements.

The response retains extracted title, company, location, the original submitted description, and nullable `source_url` for stored-record compatibility. New description-only analyses always return `source_url: null`.

## Data and security

The description is untrusted input and remains delimited inside `<JOB_DATA>`. Embedded instructions cannot change the configured provider/model, reveal credentials, or alter the response schema. No network fetching, browser permissions, or page scraping is introduced.

## Compatibility

Previously saved job-analysis records can still be rendered because the response schema is unchanged. The extension request schema stops sending removed metadata fields. Existing database columns and job metadata remain valid; extracted metadata replaces user-provided fallbacks.

## Verification

Backend smoke validation proves description-only requests succeed and missing/short descriptions fail contract validation. Extension validation rejects reintroduction of Title, Company, Location, or Source URL controls and confirms the Analyze button depends only on trimmed description length. TypeScript compilation and the production extension build must pass.
