# Phase 2 Backend Intelligence Design

**Status:** Approved design candidate
**Date:** 2026-07-19
**Source requirement:** `ATS_APPLICATION_COPILOT_POC_SPEC.md` version 1.3

## Goal

Replace Phase 1 mock intelligence with a real local backend and connect it to the extension Dashboard before employer-page automation begins. Phase 2 delivers resume parsing and source verification, candidate facts, pasted-job analysis, deterministic scoring, dual-provider AI tailoring, A4 previews, PDFs, persistence, and application records. Browser scanning and form filling move to Phase 3.

## Revised delivery sequence

1. Phase 1: Complete extension UI with mock data — complete.
2. Phase 2: Backend intelligence and Dashboard/side-panel API integration.
3. Phase 3: Browser integration, ATS adapters, approved field filling, and final end-to-end proof.

Backend-first delivery avoids disposable keyword scoring, placeholder parsing, mock tailoring, and duplicate local/server domain behavior. Phase 3 retains a deterministic browser fixture plus a live Greenhouse page because repeatable DOM validation remains necessary even with a real backend.

## System architecture

```text
Chrome extension
      │ HTTPS / versioned JSON
      ▼
FastAPI routes
      │
      ▼
Domain services
 ├── ProfileService
 ├── DocumentService
 ├── JobAnalysisService
 ├── ScoringService + agent pipeline
 ├── TailoringService + critic agent
 ├── ApplicationService
 └── OperationService
      │
      ├── PostgreSQL repositories
      ├── Local filesystem object storage
      ├── DoclingParser
      ├── Playwright renderer
      └── AIProvider
            ├── OpenAIProvider
            └── OllamaProvider
```

The extension remains the user-control surface. Backend services own parsing, requirement normalization, deterministic scoring, AI orchestration, document validation, rendering, and server persistence. The employer portal remains outside Phase 2.

## Backend modules

- `profiles`: create/update profiles, corrections, fact verification, readiness.
- `documents`: uploads, validation, parse runs, source rendering, approved versions.
- `jobs`: pasted/edited job normalization and evidence-bearing requirements.
- `scoring`: deterministic component scores and explanations.
- `tailoring`: structured proposed changes, claim validation, cover letters.
- `applications`: durable jobs, documents, records, and events.
- `ai`: provider-neutral contracts plus OpenAI and Ollama implementations.
- `storage`: PostgreSQL repositories and file-object adapter.
- `operations`: synchronous POC operation lifecycle and recoverable status.

Docling is initialized once per backend process. Playwright uses the same sanitized HTML/CSS supplied to the Dashboard preview. No queue, cache service, vector database, or second parser is introduced.

## AI providers and model settings

One `AIProvider` interface supports both OpenAI and Ollama. Both providers receive the same minimum required domain inputs and must return identical Pydantic-validated output contracts.

The provider-neutral agent runtime exposes named, versioned roles rather than one monolithic prompt:

- `JobAnalystAgent`: extracts requirements, hard gates, and job evidence.
- `CandidateEvidenceAgent`: maps verified candidate facts and classifies matched, partial, missing, or unknown.
- `TailoringAgent`: proposes evidence-backed resume changes, cover letters, and non-sensitive answers.
- `CriticAgent`: reviews relevance, semantic drift, and unsupported claims before user presentation.

OpenAI and Ollama execute the same role contracts with the selected model. Each run records agent role, provider, model, prompt version, input schema version, and output schema version.

Configuration includes:

```text
AI_PROVIDER=openai | ollama
OPENAI_API_KEY=...
OPENAI_MODELS=...
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODELS=...
```

Dashboard → Settings exposes:

- Provider selection.
- Model selection populated by backend capabilities.
- Connection status and Test connection.
- A privacy-routing notice.
- The current saved preference.

`GET /ai/providers` returns configured providers and safe selectable model IDs, never credentials. OpenAI models come from a server-side allowlist. Ollama models come from configured/installed models. A provider is never silently substituted: unavailable selection returns a recoverable error.

Every provider-assisted artifact stores provider, model, prompt version, and schema version. Changing preferences affects new operations only.

## Profile and source-document verification

```text
PDF / DOCX upload
      ↓
File validation and original storage
      ↓
Docling parse
      ├── lossless parser JSON + parser/model versions
      ↓
Neutral ParsedDocument
      ↓
Candidate fact normalization
      ↓
┌───────────────────────────────┬──────────────────────────────┐
│ Rendered source resume        │ Extracted candidate facts    │
│ Paginated A4 pages            │ Confidence and provenance    │
│ Highlighted source regions    │ Edit / verify / reject       │
└───────────────────────────────┴──────────────────────────────┘
      ↓
User resolves review nudge
      ↓
Verified candidate profile
```

The uploaded document is the visual verification reference. Selecting a fact navigates to its source page and highlights its bounding box when provenance exists. Exported Markdown is never canonical.

Profile readiness states are:

- `uploaded`: original stored; parsing incomplete.
- `needs_review`: facts exist; source comparison incomplete.
- `ready`: required facts reviewed and review nudge resolved.
- `parse_failed`: original retained with retry and manual-paste recovery.

Originals and large parser artifacts use object storage. Typed identifiers, statuses, provenance, facts, and versions use PostgreSQL. Extension storage retains only workflow checkpoints and presentation preferences.

## Job analysis and deterministic scoring

Phase 2 job input is pasted/edited text plus optional source URL and structured title, company, and location. Edited text is authoritative and treated as untrusted data.

```text
Pasted/edited job
      ↓
Sanitize and delimit untrusted content
      ↓
JobAnalystAgent
      └── requirements, hard gates, and job evidence
      ↓
CandidateEvidenceAgent
      └── verified fact mappings and matched/partial/missing/unknown classifications
      ↓
Deterministic score aggregator
      └── fixed weights, caps, and scoringVersion
      ↓
Score components, hard gates, gaps, and evidence
```

Agents perform the nuanced semantic analysis, but they cannot directly choose the final numerical score. The deterministic aggregator applies the specification’s fixed weights to schema-validated classifications. Missing and unknown remain distinct. Every contribution links to job evidence and verified candidate evidence or an explicit gap. Persisted results include the agent and scoring provenance needed to reproduce and explain the outcome.

## Truth-constrained tailoring and rendering

```text
Requirement + relevant verified facts
      ↓
TailoringAgent proposes structured changes
      ↓
Pydantic schema validation
      ↓
CriticAgent reviews relevance, drift, and unsupported claims
      ↓
sourceFactId and deterministic truth validation
      ↓
Before / after / reason / evidence review
      ↓
User accepts or rejects each material change
      ↓
Approved Resume JSON
      ↓
Shared sanitized HTML/CSS
      ├── Dashboard A4 preview
      └── Playwright PDF
```

Provider output is untrusted even when valid JSON. Unsupported content and `NEW_CLAIM` proposals are rejected before reaching the client. Provider failures never erase verified facts or approved document versions.

## API boundary

Required APIs include the existing profile, document, job, match, tailoring, application, operation, preview, and PDF capabilities plus:

```text
GET  /ai/providers
POST /ai/providers/{provider}/test
PATCH /profiles/{profile_id}/ai-preferences
GET  /documents/{document_id}/source-preview
```

All errors use stable codes, safe messages, retryability, and optional details. The extension authenticates with a development bearer token. Provider credentials remain backend-only.

## Local development

```text
Docker Compose
 ├── PostgreSQL
 └── Backend API

Host services
 ├── Chrome extension development server
 └── Ollama, when selected
```

Ollama stays host-managed so existing local installations and models can be reused. The backend reaches it through configuration. Operations run synchronously behind `OperationService`; durable queues remain deferred until measured latency requires them.

## Security and privacy

- Validate file extension, MIME, size, and signature.
- Never log resume bodies, candidate PII, prompts, provider tokens, or access tokens.
- Delimit job/resume data in prompts and prohibit embedded instructions.
- Send only operation-required fields to the selected provider.
- Record migrations with Alembic and validate all persisted/API boundaries.
- Preserve originals and approved versions across recoverable failures.
- Never expose provider credentials to extension code or storage.

## Error handling

Backend-unavailable states preserve manual profile/job editing and previously persisted records. Parsing failures retain the original and offer retry/manual paste. Provider failures retain verified facts and existing document versions. Rendering failures retain approved Resume JSON. All long operations expose an operation ID and readable recovery state.

## Verification strategy

The locked POC prohibition on formal unit/E2E suites remains. Phase 2 uses executable validation and smoke scripts:

- Backend imports and configuration.
- Alembic upgrade from an empty database.
- Pydantic fixture validation.
- Fictional resume upload and Docling provenance inspection.
- Pasted-job API journey.
- Deterministic scoring repeatability.
- Agent-role schema and provenance validation.
- Unsupported-claim rejection for both provider adapters.
- Critic-agent rejection followed by deterministic truth validation.
- Conditional OpenAI/Ollama connection checks.
- Source-preview and tailored PDF rendering comparison.
- Extension typecheck/build and backend-unavailable recovery.
- Log inspection for PII/document bodies.
- Manual A4 source comparison and tailored-document review.

Only fictional development artifacts enter the repository.

## Phase boundary

Phase 2 does not include:

- Active employer-page inspection.
- Runtime host permission requests.
- Content scripts or ATS adapters.
- Employer form-field discovery or filling.
- Automated file attachment.
- Final submission.
- Ashby or Workday support.
- Production authentication, billing, queues, analytics, or deployment infrastructure.

Phase 3 will add the deterministic browser fixture, live Greenhouse validation, Generic/Greenhouse adapters, immutable approved fill plans, idempotent filling, application reconnection, and the final end-to-end proof.
