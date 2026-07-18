# Phase 2 Backend Intelligence Implementation Plan

> **Execution mode:** Implement this plan sequentially in the current workspace, without worktrees or subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Phase 1 mock intelligence with a Python 3.12/FastAPI backend that parses resumes with Docling, supports A4 source verification, runs OpenAI or Ollama agent pipelines, deterministically aggregates match scores, validates truthful tailoring, renders PDFs, persists records in PostgreSQL, and integrates those capabilities into the extension.

**Architecture:** Docker Compose runs a Python 3.12 FastAPI service and PostgreSQL. Synchronous domain services sit behind `OperationService`; SQLAlchemy/Alembic own typed persistence, a filesystem adapter owns development artifacts, Docling owns parsing, Playwright owns A4/PDF rendering, and provider-neutral named agents run through OpenAI or Ollama. The extension uses TanStack Query for server state and keeps Zustand limited to UI/workflow checkpoints.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, PostgreSQL, Docling, OpenAI Python SDK/Responses API structured outputs, Ollama Python client/structured outputs, Playwright Python, Jinja2, React, TypeScript, Zustand, TanStack Query, Zod, WXT.

**Verification constraint:** The locked POC specification prohibits formal unit-test and end-to-end-test suites. Tasks use executable contract, migration, parser, agent, scoring, rendering, API, security, and extension smoke scripts plus manual acceptance instead of adding pytest/Vitest/Playwright test frameworks.

---

## Environment prerequisite

The current host has Python 3.14.5 and Ollama 0.32.0 but no Docker. Docling will run in a Python 3.12 container for compatibility. Before Task 1 verification, the product owner installs and starts Docker Desktop, then confirms:

```bash
docker --version
docker compose version
```

Ollama remains host-managed. On macOS, the backend container uses `http://host.docker.internal:11434`.

## File map

```text
backend/
├── Dockerfile
├── compose.yaml
├── requirements.txt
├── alembic.ini
├── .env.example
├── app/
│   ├── main.py                       # app factory, middleware, routes, lifecycle
│   ├── config.py                     # validated environment settings
│   ├── errors.py                     # stable domain/API errors
│   ├── security.py                   # development bearer-token validation
│   ├── api/                          # health, AI, profiles, documents, jobs, matches, applications, operations
│   ├── models/                       # Pydantic API/domain contracts
│   ├── db/                           # SQLAlchemy base, session, ORM entities, repositories
│   ├── profiles/                     # profile and fact-verification services
│   ├── documents/                    # validation, Docling adapter, normalization, source preview, rendering
│   ├── jobs/                         # pasted-job analysis and requirement evidence
│   ├── scoring/                      # agent classifications and deterministic aggregator
│   ├── tailoring/                    # tailoring/critic pipeline and truth validators
│   ├── ai/                           # agent roles, provider protocol, OpenAI, Ollama, registry
│   ├── applications/                 # durable records and events
│   ├── operations/                   # synchronous operation lifecycle
│   └── storage/                      # filesystem object adapter and S3-compatible protocol
├── migrations/
│   ├── env.py
│   └── versions/
├── templates/                        # source preview and ATS-safe resume HTML/CSS
├── scripts/                          # executable validation/smoke journeys
└── storage/.gitkeep                  # local artifact root only
shared/
├── schemas/                          # JSON schema snapshots consumed by Python/TypeScript validators
└── examples/                         # fictional profile/job/agent artifacts
extension/
├── api/                              # fetch client, endpoints, TanStack Query configuration
├── schemas/backend.ts                # Zod backend contracts
├── features/profile/                 # upload, operation status, A4 source/fact review
├── features/job-analysis/            # pasted-job backend analysis and scoring
├── features/tailoring/               # backend proposals, preview, PDF download
└── features/dashboard/settings-page.tsx # provider/model controls
docs/manual-testing/phase-2-checklist.md
```

## Task 1: Scaffold the containerized backend and health boundary

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/compose.yaml`
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/{__init__,main,config,errors,security}.py`
- Create: `backend/app/api/{__init__,health}.py`
- Create: `backend/scripts/validate_config.py`
- Modify: `.gitignore`

- [x] **Step 1: Product owner installs Docker Desktop**

Run:

```bash
docker --version
docker compose version
```

Expected: both commands print versions and Docker Desktop reports that the engine is running.

- [x] **Step 2: Create a Python 3.12 backend image**

Use `python:3.12-slim` and install only OS packages required by Docling/OpenCV, PostgreSQL client builds, and Playwright Chromium. Copy `requirements.txt`, install it, copy `app`, and run:

```text
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Initial requirements must include compatible releases of:

```text
fastapi
uvicorn[standard]
pydantic-settings
sqlalchemy
alembic
psycopg[binary]
python-multipart
httpx
docling
openai
ollama
playwright
jinja2
bleach
```

Resolve and pin exact versions during implementation after the first successful container build; commit the pinned file.

- [x] **Step 3: Configure PostgreSQL and API services**

`compose.yaml` defines `db` with a health check and `api` depending on healthy PostgreSQL. Mount `backend/storage` for artifacts. Expose PostgreSQL only to the Compose network and API on `127.0.0.1:8000`.

Required settings:

```text
APP_ENV=development
DATABASE_URL=postgresql+psycopg://jobcopilot:jobcopilot@db:5432/jobcopilot
STORAGE_ROOT=/app/storage
DEVELOPMENT_BEARER_TOKEN=change-me-for-local-development
EXTENSION_ORIGIN_REGEX=^chrome-extension://[a-p]{32}$
AI_PROVIDER=ollama
OPENAI_API_KEY=
OPENAI_MODELS=
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODELS=
```

- [x] **Step 4: Add health and error contracts**

`GET /health` returns:

```json
{"status":"ok","database":"ok","storage":"ok","version":"0.1.0"}
```

All domain errors map to:

```json
{"error":{"code":"CONFIGURATION_ERROR","message":"Safe user-facing message","retryable":false,"details":{}}}
```

Protect every route except `/health` with the development bearer token.

- [x] **Step 5: Run config and health checks**

```bash
docker compose -f backend/compose.yaml build api
docker compose -f backend/compose.yaml up -d db api
docker compose -f backend/compose.yaml exec api python scripts/validate_config.py
curl http://127.0.0.1:8000/health
```

Expected: image builds on Python 3.12, config validation prints `Validated backend configuration`, and health returns HTTP 200.

- [x] **Step 6: Commit**

```bash
git add .gitignore backend
git commit -m "feat: scaffold phase 2 backend"
```

## Task 2: Add database entities, migrations, and storage adapters

**Files:**
- Create: `backend/app/db/{base,session,entities,repositories}.py`
- Create: `backend/app/storage/{protocol,filesystem}.py`
- Create: `backend/alembic.ini`
- Create: `backend/migrations/{env.py,script.py.mako}`
- Create: `backend/migrations/versions/0001_initial_domain.py`
- Create: `backend/scripts/validate_migrations.py`

- [x] **Step 1: Define typed ORM entities**

Create the required tables: profiles, source_documents, parse_runs, profile_facts, jobs, job_requirements, match_results, generated_documents, document_changes, applications, application_events, fill_plans, operations, and agent_runs. Use UUID strings, timezone-aware timestamps, typed statuses, foreign keys, and JSONB only for parser/agent metadata and flexible payloads.

`agent_runs` stores:

```text
id, operation_id, role, provider, model, prompt_version,
input_schema_version, output_schema_version, status,
started_at, completed_at, error_code
```

Never persist prompts, credentials, or full unredacted provider requests in `agent_runs`.

- [x] **Step 2: Implement storage protocol**

```python
class ObjectStorage(Protocol):
    def put(self, key: str, source: BinaryIO) -> StoredObject: ...
    def open(self, key: str) -> BinaryIO: ...
    def delete(self, key: str) -> None: ...
    def exists(self, key: str) -> bool: ...
```

`FilesystemStorage` rejects traversal, resolves every key under `STORAGE_ROOT`, writes atomically, and returns size plus SHA-256.

- [x] **Step 3: Create and validate migrations**

```bash
docker compose -f backend/compose.yaml exec api alembic upgrade head
docker compose -f backend/compose.yaml exec api python scripts/validate_migrations.py
```

The script confirms every required table and foreign key exists, then prints `Validated initial database schema`.

- [x] **Step 4: Commit**

```bash
git add backend/app/db backend/app/storage backend/alembic.ini backend/migrations backend/scripts
git commit -m "feat: add backend persistence boundaries"
```

## Task 3: Implement profile APIs and extension backend client

**Files:**
- Create: `backend/app/models/{common,profile,errors}.py`
- Create: `backend/app/profiles/service.py`
- Create: `backend/app/api/profiles.py`
- Create: `backend/scripts/smoke_profiles.py`
- Create: `extension/api/{client,query-client,profiles}.ts`
- Create: `extension/schemas/backend.ts`
- Modify: `extension/package.json`
- Modify: `extension/entrypoints/dashboard/main.tsx`

- [x] **Step 1: Define profile/readiness contracts**

Readiness is one of `uploaded`, `needs_review`, `ready`, or `parse_failed`. Candidate facts include source document, page, bounding box, element IDs, confidence, verification state, and user correction version.

- [x] **Step 2: Implement profile CRUD and fact verification**

Required routes:

```text
POST  /profiles
GET   /profiles/{profile_id}
PATCH /profiles/{profile_id}
POST  /profiles/{profile_id}/facts/verify
```

Fact edits create a new version and mark the fact unverified until the user verifies it. Profile readiness becomes `ready` only after the source-comparison nudge is explicitly resolved.

- [x] **Step 3: Add the extension client boundary**

Install `@tanstack/react-query`. `api/client.ts` adds base URL, bearer token, timeout/abort, Zod response validation, and stable backend-error mapping. `QueryClientProvider` wraps only extension React entry points; server data is not copied wholesale into Zustand.

- [x] **Step 4: Run smoke and extension checks**

```bash
docker compose -f backend/compose.yaml exec api python scripts/smoke_profiles.py
cd extension
pnpm compile
pnpm build
```

Expected: fictional profile create/read/edit/verify journey passes; extension builds.

- [x] **Step 5: Commit**

```bash
git add backend extension
git commit -m "feat: connect profile API contracts"
```

## Task 4: Validate and store PDF/DOCX uploads

**Files:**
- Create: `backend/app/models/document.py`
- Create: `backend/app/documents/{validation,service}.py`
- Create: `backend/app/api/documents.py`
- Create: `backend/scripts/smoke_uploads.py`
- Create: `shared/examples/resume/jordan-lee-resume.md`
- Create during validation: fictional PDF and DOCX fixtures generated from the Markdown source

- [x] **Step 1: Create fictional source artifacts**

Generate PDF and DOCX files from one fictional Jordan Lee source. Keep the generator script and generated small artifacts in `shared/examples`; never use a real candidate resume.

- [x] **Step 2: Implement upload validation**

Accept only PDF and DOCX with a configurable size limit. Validate filename extension, MIME, PDF `%PDF-` signature, DOCX ZIP signature and required OOXML members. Sanitize original filenames and store bytes under generated object keys.

- [x] **Step 3: Implement upload route and operation record**

`POST /profiles/{profile_id}/documents` stores the original, creates source-document and operation records, sets profile readiness to `uploaded`, and returns operation/document IDs. It never logs file bytes or extracted content.

- [x] **Step 4: Validate positive and negative fixtures**

`smoke_uploads.py` uploads valid PDF/DOCX plus renamed text, invalid ZIP, oversized input, and unsupported type. Expected safe error codes include `INVALID_DOCUMENT_TYPE`, `INVALID_DOCUMENT_SIGNATURE`, and `DOCUMENT_TOO_LARGE`.

- [x] **Step 5: Commit**

```bash
git add backend shared
git commit -m "feat: validate and store resume uploads"
```

## Task 5: Add Docling parsing and neutral provenance

**Files:**
- Create: `backend/app/documents/{parser,docling_parser,normalizer}.py`
- Create: `backend/app/models/parsed_document.py`
- Create: `backend/scripts/smoke_docling.py`
- Modify: `backend/app/documents/service.py`
- Modify: `backend/app/operations/service.py`

- [x] **Step 1: Define the parser-neutral contract**

`ParsedDocument` contains document ID, parser/model versions, pages, elements, element IDs/types, text, page number, bounding box, reading order, hierarchy, and provenance. Unknown page/bbox values are null, never fabricated.

- [x] **Step 2: Initialize Docling once**

Create one `DocumentConverter` during FastAPI lifespan with allowed formats PDF and DOCX. Use the standard digital PDF pipeline first; OCR remains disabled unless the extracted-text quality heuristic declares the document image-heavy or empty.

- [x] **Step 3: Store lossless and neutral outputs**

Persist lossless Docling JSON in object storage with parser/model versions, then map to `ParsedDocument` and normalized candidate facts. Exported Markdown may aid debugging but is never canonical.

- [x] **Step 4: Run parser smoke checks**

```bash
docker compose -f backend/compose.yaml exec api python scripts/smoke_docling.py
```

Expected: both fictional documents parse; PDF facts contain real page provenance; no fact references a missing element; profile becomes `needs_review`; repeated parse records a new parse run without overwriting the original.

- [x] **Step 5: Commit**

```bash
git add backend/app/documents backend/app/models backend/scripts
git commit -m "feat: parse resumes with Docling"
```

## Task 6: Build A4 source verification in the Dashboard

**Files:**
- Create: `backend/app/documents/source_preview.py`
- Create: `backend/templates/source-preview.html.j2`
- Create: `backend/app/api/source_preview.py`
- Create: `extension/api/documents.ts`
- Create: `extension/features/profile/source-preview.tsx`
- Modify: `extension/features/profile/fact-review.tsx`
- Modify: `extension/features/dashboard/profile-page.tsx`

- [ ] **Step 1: Serve safe source pages**

For PDF, provide authenticated page images or a sanitized preview derived from the original while preserving page numbering. For DOCX, render the neutral document to paginated A4 HTML and mark unavailable bbox provenance explicitly. Never inject original active content into the extension.

- [ ] **Step 2: Add source-preview API**

`GET /documents/{document_id}/source-preview` returns sanitized page HTML/image descriptors, page dimensions, and fact-region mappings. Content security prevents scripts and external resources.

- [ ] **Step 3: Implement split verification UI**

Dashboard Profile shows paginated source on the left and extracted facts on the right. Selecting a fact navigates to its page and highlights bbox provenance when available. Display a persistent nudge until the user explicitly marks source comparison complete.

- [ ] **Step 4: Manually verify A4 source comparison**

Check PDF and DOCX at 1024px, page switching, highlight alignment, missing-provenance explanation, fact edits, and readiness transition.

- [ ] **Step 5: Commit**

```bash
git add backend extension
git commit -m "feat: add A4 source fact verification"
```

## Task 7: Implement provider registry, model settings, and connection checks

**Files:**
- Create: `backend/app/models/ai.py`
- Create: `backend/app/ai/{protocol,roles,registry,openai_provider,ollama_provider}.py`
- Create: `backend/app/api/ai.py`
- Create: `backend/scripts/smoke_providers.py`
- Create: `extension/api/ai.ts`
- Modify: `extension/features/dashboard/settings-page.tsx`

- [ ] **Step 1: Define provider and named-agent contracts**

Roles are `job_analyst`, `candidate_evidence`, `tailoring`, and `critic`. `AgentRequest` contains delimited minimum inputs, provider/model, role, prompt version, and schema version. `AgentResult[T]` contains validated output plus provenance, never chain-of-thought.

- [ ] **Step 2: Implement Ollama structured outputs**

List installed models through `GET /api/tags`. Call chat with the Pydantic JSON schema as `format`, non-streaming output, and low temperature. Validate response content with the same Pydantic model. Report unavailable server/model without fallback.

- [ ] **Step 3: Implement OpenAI structured outputs**

Use the official OpenAI Python SDK and Responses API structured JSON schema. Models come only from `OPENAI_MODELS`; credentials remain backend-only. Record response ID and safe usage metadata, not prompts or document content.

- [ ] **Step 4: Add provider APIs and saved preference**

```text
GET   /ai/providers
POST  /ai/providers/{provider}/test
PATCH /profiles/{profile_id}/ai-preferences
```

Responses expose only availability, safe model IDs, selected model, and status.

- [ ] **Step 5: Implement Settings UI**

Add provider/model selectors, status, Test connection, privacy-routing notice, and Save. A provider change resets the model selection. Existing artifacts display immutable provider/model provenance.

- [ ] **Step 6: Validate configured providers**

Run Ollama checks against the installed local service. Run OpenAI checks only when `OPENAI_API_KEY` and allowlisted models are configured; otherwise verify that the provider is reported unavailable without exposing configuration details.

- [ ] **Step 7: Commit**

```bash
git add backend extension
git commit -m "feat: add OpenAI and Ollama provider settings"
```

## Task 8: Add Job Analyst and Candidate Evidence agents with deterministic scoring

**Files:**
- Create: `backend/app/models/{job,match}.py`
- Create: `backend/app/jobs/{service,prompts}.py`
- Create: `backend/app/scoring/{agent_pipeline,aggregator}.py`
- Create: `backend/app/api/{jobs,matches}.py`
- Create: `backend/scripts/smoke_scoring.py`
- Create: `shared/examples/jobs/senior-frontend-engineer.json`
- Modify: `extension/api/jobs.ts`
- Modify: `extension/features/job-analysis/{scan-view,match-view}.tsx`

- [ ] **Step 1: Define evidence-bearing agent outputs**

`JobAnalystAgent` returns requirements with category, required/preferred, hard-gate flag, normalized text, and exact job-text evidence offsets. `CandidateEvidenceAgent` returns matched/partial/missing/unknown, verified source fact IDs, reason, and bounded confidence. Neither returns a final score.

- [ ] **Step 2: Delimit untrusted inputs in versioned prompts**

Prompts state that job/resume content is data, embedded instructions are ignored, provider/model changes cannot be requested by content, and every classification needs evidence or an explicit gap.

- [ ] **Step 3: Implement deterministic aggregation**

Apply the fixed weights: hard requirements 20, required skills 30, relevant experience 20, responsibilities 15, seniority/title 5, education/certifications 5, semantic alignment 5. Validate categories, cap every component, distinguish missing/unknown, show hard-gate failures, and emit `scoringVersion`.

- [ ] **Step 4: Add pasted-job and match APIs**

`POST /jobs/analyze` invokes Job Analyst and stores requirements/agent provenance. `POST /matches/score` invokes Candidate Evidence, validates fact references, deterministically aggregates, and persists the explainable result.

- [ ] **Step 5: Prove repeatability and instruction resistance**

`smoke_scoring.py` runs the same validated agent outputs twice and asserts byte-equivalent component/final scores. It rejects out-of-range classifications, missing evidence, unverified facts, and a fixture containing provider-switch/secret-exfiltration instructions.

- [ ] **Step 6: Replace Phase 1 Scan/Match mocks**

Add pasted title/company/location/URL/job description inputs, operation progress, backend evidence groups, provider/model provenance, and a clear backend-unavailable/manual-edit state. Label the result Job Copilot’s explainable match score.

- [ ] **Step 7: Commit**

```bash
git add backend extension shared
git commit -m "feat: add agentic explainable match scoring"
```

## Task 9: Add Tailoring and Critic agents with truth validators

**Files:**
- Create: `backend/app/models/tailoring.py`
- Create: `backend/app/tailoring/{service,prompts,validators}.py`
- Create: `backend/app/api/tailoring.py`
- Create: `backend/scripts/smoke_tailoring.py`
- Modify: `extension/api/documents.ts`
- Modify: `extension/features/tailoring/{tailor-view,resume-review,cover-letter-review}.tsx`

- [ ] **Step 1: Define structured tailoring outputs**

Every proposed change contains before, after, reason, classification, sourceFactIds, confidence, target requirement IDs, Tailoring Agent provenance, and pending-review status. Critic output contains proposal ID, approved/rejected, issues, and provenance.

- [ ] **Step 2: Implement Tailoring → Critic pipeline**

Retrieve only relevant verified facts. Tailoring Agent proposes changes. Schema validation runs before Critic Agent. Critic checks relevance, drift, and unsupported claims. Deterministic validators run after critic and remain authoritative.

- [ ] **Step 3: Enforce deterministic truth rules**

Reject missing/unverified fact IDs, employers/dates/skills/degrees/certifications/metrics absent from facts, changed meaning, invalid classifications, and `NEW_CLAIM`. Critic approval never bypasses rejection.

- [ ] **Step 4: Add tailoring and approval APIs**

```text
POST /documents/tailor
POST /documents/{document_id}/approve
```

Approval creates an immutable document version. Editing a reviewed change creates a new pending version.

- [ ] **Step 5: Validate adversarial outputs**

Run valid rephrase/reorder/emphasize/remove fixtures plus invented employer, metric, skill, unverified fact, and critic-false-negative fixtures against both provider adapters’ shared contracts.

- [ ] **Step 6: Connect extension review UI**

Replace mock changes/letter with backend data. Show both Tailoring and Critic provenance, truth-validator status, evidence, before/after, and recoverable provider errors.

- [ ] **Step 7: Commit**

```bash
git add backend extension
git commit -m "feat: add truth-constrained tailoring agents"
```

## Task 10: Render shared A4 HTML and generated PDFs

**Files:**
- Create: `backend/app/documents/{resume_renderer,pdf_renderer}.py`
- Create: `backend/templates/{resume.html.j2,resume.css}`
- Create: `backend/app/api/rendering.py`
- Create: `backend/scripts/smoke_rendering.py`
- Modify: `extension/features/tailoring/resume-review.tsx`

- [ ] **Step 1: Generate sanitized shared HTML/CSS**

Render only approved Resume JSON through Jinja autoescape and an ATS-safe single template. Disallow external resources, scripts, SVG, remote fonts, and untrusted CSS.

- [ ] **Step 2: Use identical output for preview and PDF**

`GET /documents/{document_id}/preview` returns the sanitized artifact used by the sandboxed extension preview. `GET /documents/{document_id}/pdf` returns the Playwright-generated A4 PDF from the same stored HTML/CSS version.

- [ ] **Step 3: Render with Playwright Chromium**

Install only Chromium in the container. Use A4, print backgrounds, fixed margins, and no network access. Store generated PDF with SHA-256 and renderer/template versions.

- [ ] **Step 4: Run rendering checks**

`smoke_rendering.py` confirms valid PDF signature, page count, no external requests, identical HTML artifact ID for preview/PDF, and no overflow markers. Manually compare Dashboard preview and PDF pages.

- [ ] **Step 5: Commit**

```bash
git add backend extension
git commit -m "feat: render approved A4 resumes and PDFs"
```

## Task 11: Add applications and synchronous operation lifecycle

**Files:**
- Create: `backend/app/models/{application,operation}.py`
- Create: `backend/app/applications/service.py`
- Create: `backend/app/operations/service.py`
- Create: `backend/app/api/{applications,operations}.py`
- Create: `backend/scripts/smoke_applications.py`
- Modify: `extension/api/applications.ts`
- Modify: `extension/features/dashboard/applications-page.tsx`

- [ ] **Step 1: Implement operation lifecycle**

Statuses: queued, running, succeeded, failed. Synchronous handlers still create operation IDs, timestamps, result references, structured errors, retryability, and safe progress labels. Never store input bodies or prompts in operation metadata.

- [ ] **Step 2: Implement application APIs**

```text
POST  /applications
PATCH /applications/{application_id}
GET   /applications
GET   /operations/{operation_id}
```

Persist job, score, approved document versions, status, source URL, ATS when known, and events. Tab IDs remain absent until Phase 3.

- [ ] **Step 3: Connect tracker**

Replace fictional Phase 1 records with backend results, preserve filters, expose document/provider/scoring provenance, and retain readable cached state during backend errors.

- [ ] **Step 4: Verify and commit**

Run create/update/list/reload smoke journey and confirm a refresh preserves profile, document versions, match, and application.

```bash
git add backend extension
git commit -m "feat: persist backend applications and operations"
```

## Task 12: Complete extension/backend recovery and Phase 2 boundaries

**Files:**
- Create: `extension/features/states/backend-status.tsx`
- Create: `extension/scripts/inspect-phase-2.ts`
- Modify: `extension/stores/application-store.ts`
- Modify: `extension/repositories/*`
- Modify: `extension/entrypoints/{sidepanel,dashboard}/App.tsx`
- Modify: `extension/wxt.config.ts`

- [ ] **Step 1: Add backend connection state**

Show connected, unavailable, provider unavailable, operation failed, and stale cached-data states. Manual profile/job editing remains available. Never clear durable backend IDs because of a transient fetch failure.

- [ ] **Step 2: Add schema-versioned checkpoint migration**

Migrate the Phase 1 mock session to a Phase 2 checkpoint containing backend profile/application IDs, current workflow, selected provider/model, and local attachment metadata. Do not persist server response caches in Zustand.

- [ ] **Step 3: Enforce Phase 2 manifest boundary**

Update inspection so Phase 2 still fails on `activeTab`, `tabs`, `scripting`, host permissions, content scripts, ATS adapters, or employer-page selectors. The backend connection requires only configured localhost/API network access from extension pages.

- [ ] **Step 4: Run full static verification**

```bash
docker compose -f backend/compose.yaml exec api python scripts/validate_config.py
docker compose -f backend/compose.yaml exec api python scripts/validate_migrations.py
docker compose -f backend/compose.yaml exec api python scripts/smoke_profiles.py
docker compose -f backend/compose.yaml exec api python scripts/smoke_uploads.py
docker compose -f backend/compose.yaml exec api python scripts/smoke_docling.py
docker compose -f backend/compose.yaml exec api python scripts/smoke_providers.py
docker compose -f backend/compose.yaml exec api python scripts/smoke_scoring.py
docker compose -f backend/compose.yaml exec api python scripts/smoke_tailoring.py
docker compose -f backend/compose.yaml exec api python scripts/smoke_rendering.py
docker compose -f backend/compose.yaml exec api python scripts/smoke_applications.py
cd extension
pnpm validate:fixtures
pnpm validate:workflow
pnpm validate:sync
pnpm compile
pnpm build
pnpm inspect:manifest
pnpm inspect:phase-2
```

- [ ] **Step 5: Commit**

```bash
git add extension backend
git commit -m "feat: harden phase 2 backend integration"
```

## Task 13: Run the complete backend-backed smoke journey

**Files:**
- Create: `backend/scripts/smoke_phase_2.py`
- Create: `backend/scripts/inspect_logs.py`
- Create: `docs/manual-testing/phase-2-checklist.md`
- Modify: `README.md`

- [ ] **Step 1: Implement one fictional API journey**

The script creates a profile, uploads PDF, parses with Docling, verifies facts/source comparison, selects a configured provider/model, analyzes a pasted job, runs evidence agents, deterministically scores, tailors, runs critic/truth validation, approves changes, renders preview/PDF, creates an application, and reloads all durable records.

- [ ] **Step 2: Exercise both provider adapters**

Run Ollama end-to-end with an installed structured-output-capable model. Run OpenAI when configured. If OpenAI is not configured, validate provider discovery/unavailability but do not mark the real OpenAI connection acceptance item passed.

- [ ] **Step 3: Inspect logs and storage**

`inspect_logs.py` fails on fictional email/phone, resume paragraphs, prompt bodies, API keys, bearer token, or provider response bodies in container logs. Confirm originals, Docling JSON, source preview, HTML, and PDF live under generated storage keys.

- [ ] **Step 4: Write exact run and acceptance instructions**

Document Docker startup, migration, extension backend configuration, Ollama model selection, optional OpenAI key/model allowlist, Chrome reload, complete manual journey, reset, and shutdown.

- [ ] **Step 5: Product-owner manual acceptance**

Verify the full Phase 2 acceptance gate, including A4 source comparison, provider/model settings, agent provenance, deterministic score explanation, unsupported-claim rejection, preview/PDF consistency, application tracker persistence, and backend-unavailable recovery.

- [ ] **Step 6: Commit and hand off**

```bash
git add README.md docs backend extension shared
git commit -m "docs: record phase 2 backend acceptance"
```

Use the required phase handoff structure and list browser integration, ATS adapters, field discovery/filling, automated attachment, and final submission as Phase 3 limitations rather than defects.

## Plan self-review record

- All approved Phase 2 design sections and revised v1.3 acceptance requirements map to tasks.
- Named Job Analyst, Candidate Evidence, Tailoring, and Critic roles use identical OpenAI/Ollama contracts.
- Agents own semantic analysis; deterministic aggregation and truth validators remain authoritative.
- A4 uploaded-source verification precedes profile readiness.
- Provider/model selection is user-facing while credentials remain backend-only.
- No employer-page permission, content script, ATS adapter, field filling, or automatic attachment is introduced early.
- No formal automated-test framework is added; executable smoke/validation scripts cover the required boundaries.
- Python 3.12 containerization avoids dependence on the incompatible/unverified host Python 3.14 environment.
