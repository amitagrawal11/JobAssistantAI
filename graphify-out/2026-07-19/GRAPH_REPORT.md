# Graph Report - JobAssistantAI  (2026-07-19)

## Corpus Check
- 195 files · ~53,463 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1263 nodes · 2311 edges · 93 communities (83 shown, 10 thin omitted)
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 426 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Backend API Endpoints & Errors
- AI Provider Adapters (Ollama/OpenAI)
- Profiles API & Common Schemas
- Repositories & Docling Parsing
- Product Plans & Specs
- System Architecture & Compose Deps
- WXT Extension Package Config
- DB Session & Smoke Tests
- Frontend Dependencies (Radix/React)
- Source Preview Service
- Document Processing Service
- Match Scoring Pipeline
- SQLAlchemy Domain Entities
- Shared Zod Schemas & Mocks
- Application Store Actions
- Session Repository (Mock)
- Job Analysis Service
- Profile Propagation & Sidebar Design
- Scan & Match Views
- Application Store & Result Type
- Mock Fixtures & Validation
- Operation Service & Repositories
- Document API Client & Profile Setup
- Backend API Schemas (Profiles)
- Match Evidence Cards
- Active Profile State
- Fact Review UI Components
- Dashboard Pages & Navigation
- Job & Application Domain Models
- shadcn/ui Config
- Step Indicator & Workflow
- AI Settings & Providers (Frontend)
- Backend Client & Query Client
- Card/Checkbox UI & Tailor View
- Document Upload Validation
- Fill Plan UI Components
- Fixture Generation (PDF/DOCX)
- Extension Brand Icon
- Provider Registry
- Sidebar Profile Selector
- Readiness & Confirm Views
- Manifest Inspection
- Store Selectors
- TypeScript Config
- Backend Contract Validation
- Runtime Mock Validation
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- AI Agent Default Selection and Unavailable Banner Design
- .dispatch
- Docling Document Parsing
- 8. Canonical data contracts
- Global Constraints
- ATS Adapter Contract
- Phase 1 Manual Acceptance Checklist
- fill-plan.ts
- Jordan Lee
- get_session_factory
- FastAPI Backend
- main
- ATS Application Copilot Chrome Extension
- AI Profile Extraction and Editable Rescan Implementation Plan
- Sidebar Profile Selection Implementation Plan
- Backend Profile Propagation Implementation Plan
- Description-Only Job Scan Implementation Plan
- Docling Text Comparison Implementation Plan
- execute_operation
- validate_migrations.py
- upload_document
- App.tsx

## God Nodes (most connected - your core abstractions)
1. `ApiModel` - 44 edges
2. `DomainError` - 38 edges
3. `ProfileService` - 29 edges
4. `Profile` - 26 edges
5. `Base` - 24 edges
6. `MatchScoringPipeline` - 24 edges
7. `Operation` - 23 edges
8. `5. User experience` - 22 edges
9. `ProfileFact` - 21 edges
10. `Phase 2 Backend Intelligence Design` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Jordan Lee Resume (PDF)` --conceptually_related_to--> `Docling Document Parsing`  [INFERRED]
  shared/examples/resume/jordan-lee-resume.pdf → docs/ATS_APPLICATION_COPILOT_POC_SPEC.md
- `Phase 1 Manual Acceptance Checklist` --references--> `Jordan Lee / Northstar Labs Mock Data`  [INFERRED]
  docs/manual-testing/phase-1-checklist.md → README.md
- `Jordan Lee Resume (PDF)` --semantically_similar_to--> `Jordan Lee Resume (Markdown)`  [INFERRED] [semantically similar]
  shared/examples/resume/jordan-lee-resume.pdf → shared/examples/resume/jordan-lee-resume.md
- `Job Copilot` --conceptually_related_to--> `Phase 1: Extension UI with Mock Data`  [INFERRED]
  README.md → docs/ATS_APPLICATION_COPILOT_POC_SPEC.md
- `docling dependency` --implements--> `Docling Document Parsing`  [INFERRED]
  backend/requirements-docling.txt → docs/ATS_APPLICATION_COPILOT_POC_SPEC.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agentic Deterministic Scoring Flow** — docs_ats_application_copilot_poc_spec_job_analyst_agent, docs_ats_application_copilot_poc_spec_candidate_evidence_agent, docs_ats_application_copilot_poc_spec_deterministic_scoring [EXTRACTED 0.95]
- **Safe Browser-Fill Boundary** — docs_ats_application_copilot_poc_spec_side_panel, docs_ats_application_copilot_poc_spec_service_worker, docs_ats_application_copilot_poc_spec_content_script, docs_ats_application_copilot_poc_spec_ats_adapter, docs_ats_application_copilot_poc_spec_fill_plan [EXTRACTED 0.95]
- **Truth-Constrained Tailoring Pipeline** — docs_ats_application_copilot_poc_spec_candidate_facts, docs_ats_application_copilot_poc_spec_tailoring_agent, docs_ats_application_copilot_poc_spec_critic_agent, docs_ats_application_copilot_poc_spec_a4_pdf_generation [EXTRACTED 0.90]
- **Provider-Neutral Named Agent Pipeline** — docs_superpowers_specs_2026_07_19_phase_2_backend_intelligence_design_job_analyst_agent, docs_superpowers_specs_2026_07_19_phase_2_backend_intelligence_design_candidate_evidence_agent, docs_superpowers_specs_2026_07_19_phase_2_backend_intelligence_design_tailoring_agent, docs_superpowers_specs_2026_07_19_phase_2_backend_intelligence_design_critic_agent [EXTRACTED 1.00]
- **Dual-Backend AIProvider Abstraction** — docs_superpowers_specs_2026_07_19_phase_2_backend_intelligence_design_ai_provider, docs_superpowers_specs_2026_07_19_phase_2_backend_intelligence_design_openai_provider, docs_superpowers_specs_2026_07_19_phase_2_backend_intelligence_design_ollama_provider [EXTRACTED 1.00]
- **Active Profile Cross-Surface State Flow** — docs_superpowers_plans_2026_07_19_backend_profile_propagation_use_active_backend_profile_hook, docs_superpowers_plans_2026_07_19_backend_profile_propagation_active_profile_state, docs_superpowers_specs_2026_07_19_backend_profile_propagation_design_cross_surface_sync, docs_superpowers_specs_2026_07_19_sidebar_profile_selection_design_active_profile_id [INFERRED 0.80]

## Communities (93 total, 10 thin omitted)

### Community 0 - "Backend API Endpoints & Errors"
Cohesion: 0.22
Nodes (6): health(), create_app(), lifespan(), DevelopmentBearerTokenMiddleware, BaseHTTPMiddleware, FastAPI

### Community 1 - "AI Provider Adapters (Ollama/OpenAI)"
Cohesion: 0.06
Nodes (37): ollama_compatible_schema(), OllamaProvider, Any, BaseModel, OutputT, ProviderInfo, Keep structural validation while removing grammar-unsupported annotations., _strip_unsupported_schema_keys() (+29 more)

### Community 2 - "Profiles API & Common Schemas"
Cohesion: 0.08
Nodes (41): create_profile(), get_profile(), list_profiles(), profile_id(), FactVerificationRequest, ProfileCreate, ProfileUpdate, Session (+33 more)

### Community 3 - "Repositories & Docling Parsing"
Cohesion: 0.10
Nodes (26): _canonical_category(), _element_chunks(), extract_candidate_facts(), validate_extracted_facts(), DoclingParser, _needs_ocr(), _package_version(), Path (+18 more)

### Community 4 - "Product Plans & Specs"
Cohesion: 0.08
Nodes (28): Zustand Application Store, Manifest Boundary Inspection, MockSessionRepository, Phase 1 Extension UI Plan, Workflow Transition Table, WXT Extension Package, Architecture, Calm Professional Visual Direction (+20 more)

### Community 5 - "System Architecture & Compose Deps"
Cohesion: 0.21
Nodes (13): ollama dependency, openai dependency, AI Provider Interface, CandidateEvidenceAgent, CriticAgent, Deterministic Match Scoring, JobAnalystAgent, Never Invent Candidate Facts Principle (+5 more)

### Community 6 - "WXT Extension Package Config"
Cohesion: 0.05
Nodes (38): description, devDependencies, tailwindcss, @tailwindcss/vite, tsx, @types/react, @types/react-dom, typescript (+30 more)

### Community 7 - "DB Session & Smoke Tests"
Cohesion: 0.09
Nodes (27): JobRequirementOutput, AggregatedMatch, EvidenceClassification, MatchItem, MatchScoreResponse, str, RequirementEvidence, aggregate_match() (+19 more)

### Community 8 - "Frontend Dependencies (Radix/React)"
Cohesion: 0.06
Nodes (31): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, lucide-react, @radix-ui/react-checkbox, @radix-ui/react-dialog (+23 more)

### Community 9 - "Source Preview Service"
Cohesion: 0.18
Nodes (6): Session, Session, ObjectStorage, BinaryIO, Protocol, StoredObject

### Community 10 - "Document Processing Service"
Cohesion: 0.31
Nodes (8): _document_id(), Session, UUID, reprocess_document(), source_preview(), get_settings(), Settings, BaseSettings

### Community 12 - "SQLAlchemy Domain Entities"
Cohesion: 0.06
Nodes (62): analyze_job(), Session, Base, IdentifierMixin, TimestampMixin, AgentRun, Application, ApplicationEvent (+54 more)

### Community 13 - "Shared Zod Schemas & Mocks"
Cohesion: 0.22
Nodes (9): mockDocuments, applicationStatusSchema, confidenceSchema, matchClassificationSchema, generatedDocumentsSchema, tailoredChangeSchema, tailoredClassificationSchema, matchItemSchema (+1 more)

### Community 14 - "Application Store Actions"
Cohesion: 0.10
Nodes (3): ApplicationActions, ApplicationFilter, DashboardSection

### Community 15 - "Session Repository (Mock)"
Cohesion: 0.18
Nodes (9): cloneSeed(), MemorySessionRepository, MockSessionRepository, SessionLoadResult, PersistedSession, sessionSchema, dashboard, repository (+1 more)

### Community 16 - "Job Analysis Service"
Cohesion: 0.04
Nodes (48): 10.1 Manifest and extension entry points, 10.2 React UI foundation, 10.3 shadcn/ui and CSS design system, 10.4 Zustand workflow model, 10.5 Mock data, 10.6 Side-panel interactions, 10.7 Workspace interactions, 10. Phase 1 implementation scope (+40 more)

### Community 17 - "Profile Propagation & Sidebar Design"
Cohesion: 0.07
Nodes (32): ActiveProfileState Mapper, Backend Profile Propagation Plan, Mock Data Notice Component, Six-Stage Step Indicator, useActiveBackendProfile Hook, isScanReadOnly Helper, GET /profiles Collection Endpoint, profileSelectionState Helper (+24 more)

### Community 18 - "Scan & Match Views"
Cohesion: 0.11
Nodes (28): getSourcePreview(), sourcePreviewQueryKey(), getProfile(), verifyProfileFacts(), parsedTextMatches(), ParsedSourceText(), Fact, SourceFactVerification() (+20 more)

### Community 19 - "Application Store & Result Type"
Cohesion: 0.15
Nodes (8): err(), ok(), Result, SessionRepository, allowedTransitions, ApplicationStore, createApplicationStore(), initialState

### Community 20 - "Mock Fixtures & Validation"
Cohesion: 0.40
Nodes (4): mockApplications, statuses, applicationRecordSchema, trackedApplicationStatusSchema

### Community 21 - "Operation Service & Repositories"
Cohesion: 0.09
Nodes (22): 5.10 Tailor-resume mockup, 5.11 Fill-application mockup, 5.12 Confirm-application mockup, 5.13 Submission-detected mockup, 5.14 Workspace shell mockup, 5.15 Profile-setup mockup, 5.16 Candidate-fact verification mockup, 5.17 A4 resume-review mockup (+14 more)

### Community 22 - "Document API Client & Profile Setup"
Cohesion: 0.14
Nodes (14): apiRequest(), BackendConnection, BackendError, connection(), executeParse(), reprocessDocument(), uploadDocument(), createProfile() (+6 more)

### Community 23 - "Backend API Schemas (Profiles)"
Cohesion: 0.11
Nodes (18): AI providers and model settings, API boundary, Backend modules, CriticAgent, Error handling, Goal, Job analysis and deterministic scoring, Local development (+10 more)

### Community 24 - "Match Evidence Cards"
Cohesion: 0.27
Nodes (6): EvidenceRow(), MatchItem, mockCandidate, CandidateFact, candidateFactSchema, candidateProfileSchema

### Community 25 - "Active Profile State"
Cohesion: 0.14
Nodes (15): listProfiles(), deriveProfileSelectionState(), selectActiveProfile(), readinessLabel, SidebarProfileSelector(), baseProfile, failed, loading (+7 more)

### Community 26 - "Fact Review UI Components"
Cohesion: 0.07
Nodes (33): ConfidenceBadge(), Entry, FieldMappingRow(), ReadinessSummary(), A4Page(), Change, ChangeCard(), Badge() (+25 more)

### Community 28 - "Dashboard Pages & Navigation"
Cohesion: 0.17
Nodes (14): testProvider(), profileQueryKey(), App(), initialSection(), navigation, ApplicationsPage(), DocumentsPage(), ProfilePage() (+6 more)

### Community 29 - "Job & Application Domain Models"
Cohesion: 0.23
Nodes (11): coreFields, mockJob, ApplicationRecord, ApplicationStatus, FillPlan, fieldDescriptorSchema, Job, jobSchema (+3 more)

### Community 30 - "shadcn/ui Config"
Cohesion: 0.14
Nodes (13): aliases, components, lib, ui, utils, rsc, $schema, style (+5 more)

### Community 31 - "Step Indicator & Workflow"
Cohesion: 0.11
Nodes (17): Environment prerequisite, File map, Phase 2 Backend Intelligence Implementation Plan, Plan self-review record, Task 10: Render shared A4 HTML and generated PDFs, Task 11: Add applications and synchronous operation lifecycle, Task 12: Complete extension/backend recovery and Phase 2 boundaries, Task 13: Run the complete backend-backed smoke journey (+9 more)

### Community 32 - "AI Settings & Providers (Frontend)"
Cohesion: 0.16
Nodes (19): getProviders(), providersQueryKey, saveAiPreference(), AgentUnavailableBanner(), deriveAiDefault(), formatDefaultNotice(), isAgentAvailable(), isPreferenceValid() (+11 more)

### Community 34 - "Backend Client & Query Client"
Cohesion: 0.12
Nodes (16): 6.10 Trust boundaries and page-content safety, 6.1 High-level system context, 6.2 Phase delivery diagram, 6.3.1 Frontend state and persistence boundaries, 6.3.2 Application identity and recoverability, 6.3 Extension runtime diagram, 6.4 Resume ingestion and verification diagram, 6.5 Job analysis and scoring diagram (+8 more)

### Community 35 - "Card/Checkbox UI & Tailor View"
Cohesion: 0.15
Nodes (13): canAnalyzeDescription Helper, Description-Only Job Scan Plan, JobAnalyzeRequest Contract, API contract, Compatibility, Data and security, Delimited JOB_DATA Untrusted Input, Description-Only Job Scan Design (+5 more)

### Community 36 - "Document Upload Validation"
Cohesion: 0.14
Nodes (13): File map, Phase 1 Extension UI Implementation Plan, Plan self-review record, Task 10: Document, manually accept, and hand off Phase 1, Task 1: Scaffold the WXT extension and visual foundation, Task 2: Define validated domain contracts and fictional fixtures, Task 3: Add the repository boundary and legal workflow store, Task 4: Build curated primitives and persistent shells (+5 more)

### Community 37 - "Fill Plan UI Components"
Cohesion: 0.17
Nodes (13): ATS Application Copilot POC Specification, Scan-Match-Tailor-Fill-Confirm Journey, Side-Panel Application Assistant, Full-Page Extension Workspace, Dashboard Entry Point HTML, Side Panel Entry Point HTML, Development, Job Copilot (+5 more)

### Community 38 - "Fixture Generation (PDF/DOCX)"
Cohesion: 0.43
Nodes (7): Document, configure_docx_styles(), generate_docx(), generate_pdf(), Generate fictional PDF and DOCX resumes from the adjacent Markdown source., set_run_font(), source_lines()

### Community 39 - "Extension Brand Icon"
Cohesion: 0.25
Nodes (8): Icon 128px Variant, Browser Extension Brand Mark, Puzzle Piece Metaphor (Extension / Fitting Together), Extension Brand Icon (Green Puzzle Piece, 128/96/48/32/16px), Icon 16px Variant, Icon 32px Variant, Icon 48px Variant, Icon 96px Variant

### Community 40 - "Provider Registry"
Cohesion: 0.19
Nodes (12): AI Profile Extraction and Editable Rescan Plan, Evidence-Grounded Extraction Contract, Extract Again with AI Action, Document Reprocess Endpoint, AI Profile Extraction and Editable Rescan Design, Editable Rescan Behavior, Goal, Profile extraction (+4 more)

### Community 41 - "Sidebar Profile Selector"
Cohesion: 0.18
Nodes (12): Docling Text Comparison Plan, Parsed Source Text Panel, Source-Preview Response Contract, Docling Parser Adapter, Approved layout, Data contract, Docling Text Comparison Design, Empty and error behavior (+4 more)

### Community 42 - "Readiness & Confirm Views"
Cohesion: 0.38
Nodes (3): FilesystemStorage, BinaryIO, Path

### Community 43 - "Manifest Inspection"
Cohesion: 0.33
Nodes (5): expected, expectedHosts, forbidden, found, manifest

### Community 44 - "Store Selectors"
Cohesion: 0.20
Nodes (10): agent_runs Provenance Table, Deterministic Score Aggregator, FastAPI Containerized Backend, OperationService Lifecycle, Phase 2 Backend Intelligence Plan, Playwright A4/PDF Renderer, AIProvider Interface, CandidateEvidenceAgent (+2 more)

### Community 45 - "TypeScript Config"
Cohesion: 0.33
Nodes (5): compilerOptions, allowImportingTsExtensions, jsx, extends, ./.wxt/tsconfig.json

### Community 46 - "Backend Contract Validation"
Cohesion: 0.50
Nodes (3): assert_http_contracts(), Executable contract check for the Phase 2 backend boundary., read_json()

### Community 47 - "Runtime Mock Validation"
Cohesion: 0.50
Nodes (3): forbidden, runtimeFiles, scanSource

### Community 51 - "Community 51"
Cohesion: 0.67
Nodes (3): Application Identity (applicationId/jobFingerprint/tabId), Repository Layer (Session/Document), Zustand UI/Workflow Store

### Community 72 - "AI Agent Default Selection and Unavailable Banner Design"
Cohesion: 0.20
Nodes (9): AI Agent Default Selection and Unavailable Banner Design, Background, Components and boundaries, Default selection, Errors and edge cases, Goal, Out of scope, Unavailable banner (+1 more)

### Community 73 - ".dispatch"
Cohesion: 0.25
Nodes (7): domain_error_response(), error_response(), Any, Request, Response, JSONResponse, RequestResponseEndpoint

### Community 74 - "Docling Document Parsing"
Cohesion: 0.25
Nodes (9): docling dependency, playwright dependency, A4 Preview and PDF Generation, Verified Candidate Facts, Docling Document Parsing, Candidate Fact Verification with A4 Source, Jordan Lee / Northstar Labs Mock Data, Jordan Lee Resume (Markdown) (+1 more)

### Community 75 - "8. Canonical data contracts"
Cohesion: 0.22
Nodes (9): 8.1 Candidate profile, 8.2 Job, 8.3 Match result, 8.4 Fill plan, 8.5 Tailored document change, 8.6 Application, 8.7 Tailoring classifications, 8.8 Workflow invariants (+1 more)

### Community 76 - "Global Constraints"
Cohesion: 0.22
Nodes (8): AI Agent Default Selection and Unavailable Banner Implementation Plan, Global Constraints, Task 1: Pure default-selection logic + validator, Task 2: `useEnsureAiDefault` hook, Task 3: `AgentUnavailableBanner` component + styles, Task 4: Wire hook + banner into both App roots, Task 5: Settings AI card — no-agent block, Task 6: Full verification

### Community 77 - "ATS Adapter Contract"
Cohesion: 0.29
Nodes (8): ATS Adapter Contract, Content Script, Approved Immutable Fill Plan, GenericAdapter, GreenhouseAdapter, Phase 3: Browser Integration and Filling, Extension Service Worker, User-Controlled Final Submission Principle

### Community 78 - "Phase 1 Manual Acceptance Checklist"
Cohesion: 0.25
Nodes (6): Chrome acceptance gate, Phase 1 Manual Acceptance Checklist, Recovery checks, Scope inspection, Sign-off, Static checks

### Community 79 - "fill-plan.ts"
Cohesion: 0.17
Nodes (10): mockFillPlan, mockMatchResult, mockSession, fieldConfidenceSchema, fieldSensitivitySchema, fillEntryStatusSchema, fillPlanEntrySchema, fillPlanSchema (+2 more)

### Community 80 - "Jordan Lee"
Cohesion: 0.25
Nodes (7): Education, Experience, Frontend Engineer | Cedar Systems | 2018-2022, Jordan Lee, Professional Summary, Senior Frontend Engineer | Northstar Labs | 2022-Present, Skills

### Community 81 - "get_session_factory"
Cohesion: 0.38
Nodes (6): get_engine(), get_session(), get_session_factory(), Session, Engine, sessionmaker

### Community 82 - "FastAPI Backend"
Cohesion: 0.33
Nodes (7): Backend API Compose Service, PostgreSQL Compose Service, fastapi dependency, sqlalchemy dependency, FastAPI Backend, Phase 1: Extension UI with Mock Data, Phase 2: Backend Intelligence and Integration

### Community 83 - "main"
Cohesion: 0.57
Nodes (6): create_profile(), main(), process(), Client, Parse fictional PDF/DOCX resumes and validate neutral provenance., upload()

### Community 84 - "ATS Application Copilot Chrome Extension"
Cohesion: 0.29
Nodes (7): 1. Purpose, 2. Locked product decisions, 3. Corrected phase plan, 4. Instructions for implementation agents, 7. Repository structure, ATS Application Copilot Chrome Extension, POC Product and Implementation Specification

### Community 85 - "AI Profile Extraction and Editable Rescan Implementation Plan"
Cohesion: 0.33
Nodes (5): AI Profile Extraction and Editable Rescan Implementation Plan, Task 1: Evidence-grounded extraction contract, Task 2: Document processing integration, Task 3: Profile and Scan UI, Task 4: Verification

### Community 86 - "Sidebar Profile Selection Implementation Plan"
Cohesion: 0.33
Nodes (5): Sidebar Profile Selection Implementation Plan, Task 1: Add the backend profile collection, Task 2: Add profile selection state and contract validation, Task 3: Render the selector and fix Scan editability, Task 4: Final verification and commit

### Community 87 - "Backend Profile Propagation Implementation Plan"
Cohesion: 0.40
Nodes (4): Backend Profile Propagation Implementation Plan, Task 1: Define and validate authoritative profile state, Task 2: Add the shared active-profile hook and six-stage sidebar, Task 3: Label remaining mocks and complete verification

### Community 88 - "Description-Only Job Scan Implementation Plan"
Cohesion: 0.40
Nodes (4): Description-Only Job Scan Implementation Plan, Task 1: Lock the description-only backend contract, Task 2: Reduce the Scan UI to one input, Task 3: Verify and commit

### Community 89 - "Docling Text Comparison Implementation Plan"
Cohesion: 0.40
Nodes (4): Docling Text Comparison Implementation Plan, Task 1: Source-preview contract, Task 2: Parsed-text profile view, Task 3: Final verification and commit

### Community 90 - "execute_operation"
Cohesion: 0.50
Nodes (4): execute_operation(), Request, Session, DocumentParseResponse

### Community 91 - "validate_migrations.py"
Cohesion: 0.50
Nodes (3): assert_filesystem_storage(), assert_schema(), Executable contract for the initial database schema and object storage.

### Community 92 - "upload_document"
Cohesion: 0.67
Nodes (3): Session, upload_document(), UploadFile

### Community 94 - "App.tsx"
Cohesion: 0.10
Nodes (22): analyzeJob(), scoreMatch(), StepIndicator(), StepName, steps, ScoreRing(), ErrorState(), Textarea (+14 more)

## Knowledge Gaps
- **387 isolated node(s):** `BackendConnection`, `$schema`, `style`, `rsc`, `tsx` (+382 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DomainError` connect `SQLAlchemy Domain Entities` to `Backend API Endpoints & Errors`, `AI Provider Adapters (Ollama/OpenAI)`, `Profiles API & Common Schemas`, `.dispatch`, `Document Processing Service`, `execute_operation`, `upload_document`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `ApiModel` connect `Profiles API & Common Schemas` to `AI Provider Adapters (Ollama/OpenAI)`, `Repositories & Docling Parsing`, `DB Session & Smoke Tests`, `SQLAlchemy Domain Entities`, `execute_operation`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `get_settings()` connect `Document Processing Service` to `Backend API Endpoints & Errors`, `AI Provider Adapters (Ollama/OpenAI)`, `Repositories & Docling Parsing`, `DB Session & Smoke Tests`, `.dispatch`, `Match Scoring Pipeline`, `SQLAlchemy Domain Entities`, `get_session_factory`, `main`, `execute_operation`, `validate_migrations.py`, `upload_document`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 41 inferred relationships involving `ApiModel` (e.g. with `AgentProvenance` and `AgentRequest`) actually correct?**
  _`ApiModel` has 41 INFERRED edges - model-reasoned connections that need verification._
- **Are the 34 inferred relationships involving `DomainError` (e.g. with `save_ai_preferences()` and `test_provider()`) actually correct?**
  _`DomainError` has 34 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `ProfileService` (e.g. with `create_profile()` and `get_profile()`) actually correct?**
  _`ProfileService` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `Profile` (e.g. with `save_ai_preferences()` and `Base`) actually correct?**
  _`Profile` has 19 INFERRED edges - model-reasoned connections that need verification._