# Graph Report - JobAssistantAI  (2026-07-25)

## Corpus Check
- 314 files · ~116,083 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2362 nodes · 4500 edges · 183 communities (140 shown, 43 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 599 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3d710429`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- source-preview.tsx
- Dashboard Pages & Navigation
- Job & Application Domain Models
- shadcn/ui Config
- Step Indicator & Workflow
- AI Settings & Providers (Frontend)
- document.ts
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
- Community 61
- Community 62
- Community 63
- Community 64
- Community 70
- Community 71
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
- env.py
- App.tsx
- applications.tsx
- documents.tsx
- App.tsx
- JobPostingQueryService
- state.ts
- apiRequest
- autoapply.tsx
- entities.py
- session.ts
- Operation
- AI Job Assistant Frontend Redesign Design
- dialog.tsx
- browser-storage.ts
- package.json
- profile.ts
- package.json
- sheet.tsx
- plugins
- plugins
- client.ts
- JobAnalyzeRequest
- LeverQuickApplyClient
- main
- validate_document
- scan-view.tsx
- document.ts
- useSidebar
- BackendError
- tsconfig.json
- tsconfig.json
- React + TypeScript + Vite
- badge.tsx
- React + TypeScript + Vite
- result.ts
- @fontsource-variable/plus-jakarta-sans
- radix-ui
- @radix-ui/react-dialog
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @radix-ui/react-select
- @radix-ui/react-tabs
- shadcn
- tailwind-merge
- @tanstack/react-query
- @fontsource-variable/plus-jakarta-sans
- zustand
- start.sh
- clsx
- react-dom
- radix-ui
- @radix-ui/react-dialog
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @fontsource-variable/inter
- @radix-ui/react-tabs
- execute_operation
- class-variance-authority
- tailwind-merge
- badge.tsx
- zustand
- source_preview.py
- jobs_scheduler.py
- @radix-ui/react-dialog
- shadcn
- @radix-ui/react-checkbox
- shadcn
- jobs_scheduler.py
- @radix-ui/react-select
- react
- tw-animate-css

## God Nodes (most connected - your core abstractions)
1. `cn()` - 90 edges
2. `cn()` - 80 edges
3. `ApiModel` - 73 edges
4. `DomainError` - 59 edges
5. `apiRequest()` - 41 edges
6. `ProfileService` - 40 edges
7. `Profile` - 38 edges
8. `TailoringPipeline` - 30 edges
9. `apiRequest()` - 26 edges
10. `Operation` - 25 edges

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

## Communities (183 total, 43 thin omitted)

### Community 0 - "Backend API Endpoints & Errors"
Cohesion: 0.11
Nodes (26): create_application(), list_applications(), Session, update_application(), get_overview(), Session, ApplicationTrackingService, _parse_uuid() (+18 more)

### Community 1 - "AI Provider Adapters (Ollama/OpenAI)"
Cohesion: 0.06
Nodes (37): ollama_compatible_schema(), OllamaProvider, Any, BaseModel, OutputT, ProviderInfo, Keep structural validation while removing grammar-unsupported annotations., _strip_unsupported_schema_keys() (+29 more)

### Community 2 - "Profiles API & Common Schemas"
Cohesion: 0.16
Nodes (23): add_profile_fact(), create_profile(), delete_profile(), delete_profile_fact(), get_profile(), list_profiles(), profile_id(), FactVerificationRequest (+15 more)

### Community 3 - "Repositories & Docling Parsing"
Cohesion: 0.08
Nodes (43): OperationRepository, ProfileRepository, Session, UUID, Repository, _best_matching_element(), _canonical_category(), _element_chunks() (+35 more)

### Community 4 - "Product Plans & Specs"
Cohesion: 0.08
Nodes (28): Zustand Application Store, Manifest Boundary Inspection, MockSessionRepository, Phase 1 Extension UI Plan, Workflow Transition Table, WXT Extension Package, Architecture, Calm Professional Visual Direction (+20 more)

### Community 5 - "System Architecture & Compose Deps"
Cohesion: 0.21
Nodes (13): ollama dependency, openai dependency, AI Provider Interface, CandidateEvidenceAgent, CriticAgent, Deterministic Match Scoring, JobAnalystAgent, Never Invent Candidate Facts Principle (+5 more)

### Community 6 - "WXT Extension Package Config"
Cohesion: 0.07
Nodes (49): boot(), cdnScriptFor(), collectProps(), compileAttr(), compileTemplate(), contentKey(), createComponentFactory(), createExternalModules() (+41 more)

### Community 7 - "DB Session & Smoke Tests"
Cohesion: 0.19
Nodes (9): Remove records and artifacts created by executable smoke journeys., register_job(), register_profile(), main(), Backend-backed fictional profile create/edit/verify journey., request(), main(), Validate safe provider discovery, connection checks, and saved preferences. (+1 more)

### Community 8 - "Frontend Dependencies (Radix/React)"
Cohesion: 0.15
Nodes (19): backendCandidateFactSchema, BackendProfile, backendProfileSchema, DocumentParse, documentParseSchema, documentReprocessSchema, DocumentUpload, documentUploadSchema (+11 more)

### Community 9 - "Source Preview Service"
Cohesion: 0.10
Nodes (21): Combobox(), COMMON_TITLES, COUNTRIES, EARLIEST_START, ETHNICITIES, formatDateRange(), GENDERS, KNOWN_SKILLS (+13 more)

### Community 10 - "Document Processing Service"
Cohesion: 0.07
Nodes (45): navigation, Progress(), Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+37 more)

### Community 11 - "Match Scoring Pipeline"
Cohesion: 0.19
Nodes (15): JobRequirement, JobRequirementOutput, AggregatedMatch, CandidateEvidenceOutput, EvidenceClassification, MatchItem, MatchScoreRequest, MatchScoreResponse (+7 more)

### Community 12 - "SQLAlchemy Domain Entities"
Cohesion: 0.16
Nodes (23): ParseRun, ProfileFact, SourceDocument, _derive_contact_socials(), DocumentProcessingService, DocumentService, _preferred_extraction_model(), UUID (+15 more)

### Community 13 - "Shared Zod Schemas & Mocks"
Cohesion: 0.07
Nodes (20): AshbyConnector, Client, datetime, AtsConnector, NormalizedPosting, Protocol, Fetch every active posting this connector is responsible for., GreenhouseConnector (+12 more)

### Community 14 - "Application Store Actions"
Cohesion: 0.16
Nodes (18): Card(), CardAction(), CardContent(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), Progress() (+10 more)

### Community 15 - "Session Repository (Mock)"
Cohesion: 0.08
Nodes (29): ApplicationRecord, applicationRecordSchema, trackedApplicationStatusSchema, ApplicationStatus, applicationStatusSchema, confidenceSchema, matchClassificationSchema, GeneratedDocuments (+21 more)

### Community 16 - "Job Analysis Service"
Cohesion: 0.04
Nodes (48): 10.1 Manifest and extension entry points, 10.2 React UI foundation, 10.3 shadcn/ui and CSS design system, 10.4 Zustand workflow model, 10.5 Mock data, 10.6 Side-panel interactions, 10.7 Workspace interactions, 10. Phase 1 implementation scope (+40 more)

### Community 17 - "Profile Propagation & Sidebar Design"
Cohesion: 0.07
Nodes (32): ActiveProfileState Mapper, Backend Profile Propagation Plan, Mock Data Notice Component, Six-Stage Step Indicator, useActiveBackendProfile Hook, isScanReadOnly Helper, GET /profiles Collection Endpoint, profileSelectionState Helper (+24 more)

### Community 18 - "Scan & Match Views"
Cohesion: 0.17
Nodes (18): AutoApplyQueueItem, delete_queue_item(), enqueue(), list_queue(), Session, update_queue_item(), AutoApplyService, _parse_uuid() (+10 more)

### Community 19 - "Application Store & Result Type"
Cohesion: 0.23
Nodes (7): Button(), buttonVariants, Input(), ApplicationsPage(), FactCard(), BackendFact, FactReview()

### Community 20 - "Mock Fixtures & Validation"
Cohesion: 0.13
Nodes (17): analyzeJob(), scoreMatch(), tailorDocuments(), ScoreRing(), ErrorState(), backendMaxUnlocked(), isScanReadOnly(), StartApplicationFlow() (+9 more)

### Community 21 - "Operation Service & Repositories"
Cohesion: 0.09
Nodes (22): 5.10 Tailor-resume mockup, 5.11 Fill-application mockup, 5.12 Confirm-application mockup, 5.13 Submission-detected mockup, 5.14 Workspace shell mockup, 5.15 Profile-setup mockup, 5.16 Candidate-fact verification mockup, 5.17 A4 resume-review mockup (+14 more)

### Community 22 - "Document API Client & Profile Setup"
Cohesion: 0.07
Nodes (33): Input(), Sidebar(), SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup(), SidebarGroupAction() (+25 more)

### Community 23 - "Backend API Schemas (Profiles)"
Cohesion: 0.11
Nodes (18): AI providers and model settings, API boundary, Backend modules, CriticAgent, Error handling, Goal, Job analysis and deterministic scoring, Local development (+10 more)

### Community 24 - "Match Evidence Cards"
Cohesion: 0.11
Nodes (29): DocumentTailorResponse, Session, review_document_change(), tailor_documents(), ReviewStatus, ApiModel, BaseModel, SourceReference (+21 more)

### Community 25 - "Active Profile State"
Cohesion: 0.25
Nodes (4): LeverQuickApplyClient, Client, Submits an application through Lever's public posting apply form.      Lever's h, Session

### Community 26 - "Fact Review UI Components"
Cohesion: 0.12
Nodes (26): StepIndicator(), StepName, steps, StepIndicators, StepItemContext, StepItemContextValue, Stepper(), StepperContent() (+18 more)

### Community 27 - "source-preview.tsx"
Cohesion: 0.07
Nodes (44): getProviders(), providersQueryKey, saveAiPreference(), testProvider(), apiRequest(), BackendConnection, connection(), executeParse() (+36 more)

### Community 28 - "Dashboard Pages & Navigation"
Cohesion: 0.22
Nodes (17): getProviders(), providersQueryKey, saveAiPreference(), testProvider(), AgentUnavailableBanner(), deriveAiDefault(), formatDefaultNotice(), isAgentAvailable() (+9 more)

### Community 29 - "Job & Application Domain Models"
Cohesion: 0.08
Nodes (24): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+16 more)

### Community 30 - "shadcn/ui Config"
Cohesion: 0.18
Nodes (6): Badge(), badgeVariants, Checkbox(), Separator(), Skeleton(), Textarea()

### Community 31 - "Step Indicator & Workflow"
Cohesion: 0.11
Nodes (17): Environment prerequisite, File map, Phase 2 Backend Intelligence Implementation Plan, Plan self-review record, Task 10: Render shared A4 HTML and generated PDFs, Task 11: Add applications and synchronous operation lifecycle, Task 12: Complete extension/backend recovery and Phase 2 boundaries, Task 13: Run the complete backend-backed smoke journey (+9 more)

### Community 32 - "AI Settings & Providers (Frontend)"
Cohesion: 0.08
Nodes (24): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+16 more)

### Community 33 - "document.ts"
Cohesion: 0.16
Nodes (12): ReadinessSummary(), A4Page(), ConfirmView(), DashboardTarget, useOpenDashboard(), CoverLetterReview(), ResumeReview(), ApplicationFilters() (+4 more)

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
Cohesion: 0.24
Nodes (6): FilesystemStorage, BinaryIO, Path, assert_filesystem_storage(), assert_schema(), Executable contract for the initial database schema and object storage.

### Community 43 - "Manifest Inspection"
Cohesion: 0.08
Nodes (17): DoclingParser, _needs_ocr(), _package_version(), Path, Eagerly load the pipeline models into memory.          Docling loads its layout/, DocumentParser, ParserResult, Path (+9 more)

### Community 44 - "Store Selectors"
Cohesion: 0.20
Nodes (10): agent_runs Provenance Table, Deterministic Score Aggregator, FastAPI Containerized Backend, OperationService Lifecycle, Phase 2 Backend Intelligence Plan, Playwright A4/PDF Renderer, AIProvider Interface, CandidateEvidenceAgent (+2 more)

### Community 45 - "TypeScript Config"
Cohesion: 0.16
Nodes (18): analyzeJob(), scoreMatch(), reviewDocumentChange(), tailorDocuments(), CLASS_TONE, Review(), Setup(), Tailored (+10 more)

### Community 46 - "Backend Contract Validation"
Cohesion: 0.50
Nodes (3): assert_http_contracts(), Executable contract check for the Phase 2 backend boundary., read_json()

### Community 47 - "Runtime Mock Validation"
Cohesion: 0.18
Nodes (14): ApplicationRecord, trackedApplicationStatusSchema, ApplicationStatus, applicationStatusSchema, confidenceSchema, matchClassificationSchema, GeneratedDocuments, FillPlan (+6 more)

### Community 51 - "Community 51"
Cohesion: 0.67
Nodes (3): Application Identity (applicationId/jobFingerprint/tabId), Repository Layer (Session/Document), Zustand UI/Workflow Store

### Community 61 - "Community 61"
Cohesion: 0.10
Nodes (20): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+12 more)

### Community 62 - "Community 62"
Cohesion: 0.15
Nodes (8): err(), ok(), Result, SessionRepository, allowedTransitions, ApplicationStore, createApplicationStore(), initialState

### Community 63 - "Community 63"
Cohesion: 0.10
Nodes (20): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+12 more)

### Community 64 - "Community 64"
Cohesion: 0.29
Nodes (9): emit(), get(), keyFor(), listeners, readValue(), remove(), set(), StorageChangeListener (+1 more)

### Community 70 - "Community 70"
Cohesion: 0.10
Nodes (3): ApplicationActions, ApplicationFilter, DashboardSection

### Community 71 - "Community 71"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 72 - "AI Agent Default Selection and Unavailable Banner Design"
Cohesion: 0.20
Nodes (9): AI Agent Default Selection and Unavailable Banner Design, Background, Components and boundaries, Default selection, Errors and edge cases, Goal, Out of scope, Unavailable banner (+1 more)

### Community 73 - ".dispatch"
Cohesion: 0.18
Nodes (18): createApplication(), enqueueAutoApply(), jobPostingsQueryKey(), listJobPostings(), quickApplyToJobPosting(), BrowseJobsPage(), FILTERS, postedLabel() (+10 more)

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
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 80 - "Jordan Lee"
Cohesion: 0.25
Nodes (7): Education, Experience, Frontend Engineer | Cedar Systems | 2018-2022, Jordan Lee, Professional Summary, Senior Frontend Engineer | Northstar Labs | 2022-Present, Skills

### Community 81 - "get_session_factory"
Cohesion: 0.22
Nodes (13): get_engine(), get_session(), get_session_factory(), Session, cleanup(), create_profile(), main(), process() (+5 more)

### Community 82 - "FastAPI Backend"
Cohesion: 0.33
Nodes (7): Backend API Compose Service, PostgreSQL Compose Service, fastapi dependency, sqlalchemy dependency, FastAPI Backend, Phase 1: Extension UI with Mock Data, Phase 2: Backend Intelligence and Integration

### Community 83 - "main"
Cohesion: 0.16
Nodes (13): apiRequest(), BackendConnection, BackendError, connection(), executeParse(), reprocessDocument(), uploadDocument(), createProfile() (+5 more)

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
Cohesion: 0.11
Nodes (19): dependencies, @base-ui/react, class-variance-authority, @fontsource-variable/geist, @fontsource-variable/inter, lucide-react, @radix-ui/react-checkbox, react-dom (+11 more)

### Community 91 - "validate_migrations.py"
Cohesion: 0.22
Nodes (20): Base, IdentifierMixin, TimestampMixin, AgentRun, Application, ApplicationEvent, ApplicationStatus, DocumentChange (+12 more)

### Community 92 - "upload_document"
Cohesion: 0.11
Nodes (19): devDependencies, oxlint, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom, typescript (+11 more)

### Community 93 - "env.py"
Cohesion: 0.11
Nodes (19): cmdk, dependencies, @base-ui/react, clsx, cmdk, @fontsource-variable/inter, @fontsource-variable/plus-jakarta-sans, lucide-react (+11 more)

### Community 94 - "App.tsx"
Cohesion: 0.11
Nodes (19): devDependencies, oxlint, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom, typescript (+11 more)

### Community 95 - "applications.tsx"
Cohesion: 0.19
Nodes (16): applicationsQueryKey(), CreateApplicationInput, listApplications(), updateApplicationStatus(), ApplicationsPage(), FILTERS, fmtDate(), LABEL (+8 more)

### Community 96 - "documents.tsx"
Cohesion: 0.05
Nodes (53): addProfileFact(), createProfile(), deleteProfileFact(), verifyProfileFacts(), clearParsing(), emit(), listeners, markParsing() (+45 more)

### Community 97 - "App.tsx"
Cohesion: 0.11
Nodes (26): getOverview(), overviewQueryKey(), deleteProfile(), getProfile(), listProfiles(), profileQueryKey(), setDefaultProfile(), updateProfile() (+18 more)

### Community 98 - "JobPostingQueryService"
Cohesion: 0.12
Nodes (17): list_job_postings(), QuickApplyResponse, Session, quick_apply(), sync_job_postings(), JobPostingQueryService, Session, _parse_uuid() (+9 more)

### Community 99 - "state.ts"
Cohesion: 0.46
Nodes (7): assert_error(), create_profile(), main(), Client, Response, Positive and negative resume-upload contract journey., upload()

### Community 100 - "apiRequest"
Cohesion: 0.25
Nodes (12): jobPostingsQueryKey(), listJobPostings(), quickApplyToJobPosting(), JobsPage(), QuickApplyDialog(), JobPosting, JobPostingList, jobPostingListSchema (+4 more)

### Community 101 - "autoapply.tsx"
Cohesion: 0.21
Nodes (15): autoApplyQueueKey(), listAutoApplyQueue(), removeAutoApplyItem(), updateAutoApplyStatus(), AutoApplyPage(), STATUS_LABEL, STATUS_TONE, SWATCH (+7 more)

### Community 103 - "session.ts"
Cohesion: 0.12
Nodes (16): mockApplications, statuses, mockFillPlan, coreFields, mockJob, mockMatchResult, mockSession, cloneSeed() (+8 more)

### Community 104 - "Operation"
Cohesion: 0.31
Nodes (4): Operation, OperationService, Session, UUID

### Community 105 - "AI Job Assistant Frontend Redesign Design"
Cohesion: 0.13
Nodes (14): AI Job Assistant Frontend Redesign Design, App shell, Color — OKLCH, hue-swappable, Delivery sequence (phased), Design system (foundation), Error handling, Goal, Out of scope (deferred, net-new features) (+6 more)

### Community 106 - "dialog.tsx"
Cohesion: 0.11
Nodes (17): Button(), buttonVariants, Command(), CommandDialog(), CommandGroup(), CommandInput(), CommandItem(), CommandList() (+9 more)

### Community 107 - "browser-storage.ts"
Cohesion: 0.23
Nodes (11): browser, emit(), get(), keyFor(), listeners, readValue(), remove(), set() (+3 more)

### Community 108 - "package.json"
Cohesion: 0.18
Nodes (10): name, packageManager, private, scripts, build, dev, lint, preview (+2 more)

### Community 110 - "package.json"
Cohesion: 0.18
Nodes (10): name, packageManager, private, scripts, build, dev, lint, preview (+2 more)

### Community 111 - "sheet.tsx"
Cohesion: 0.18
Nodes (7): Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle()

### Community 112 - "plugins"
Cohesion: 0.20
Nodes (9): oxc, react, typescript, warn, plugins, rules, react/only-export-components, react/rules-of-hooks (+1 more)

### Community 113 - "plugins"
Cohesion: 0.20
Nodes (9): oxc, react, typescript, warn, plugins, rules, react/only-export-components, react/rules-of-hooks (+1 more)

### Community 114 - "client.ts"
Cohesion: 0.25
Nodes (7): domain_error_response(), error_response(), Any, Request, Response, JSONResponse, RequestResponseEndpoint

### Community 117 - "main"
Cohesion: 0.33
Nodes (5): fieldConfidenceSchema, fieldSensitivitySchema, fillEntryStatusSchema, fillPlanEntrySchema, fillPlanSchema

### Community 118 - "validate_document"
Cohesion: 0.13
Nodes (20): getSourcePreview(), sourcePreviewQueryKey(), getProfile(), profileQueryKey(), verifyProfileFacts(), DashboardShell(), profileIdentity(), ProfilePage() (+12 more)

### Community 120 - "document.ts"
Cohesion: 0.15
Nodes (17): analyze_job(), Session, invalid_signature(), sanitize_filename(), validate_document(), validate_docx_signature(), ValidatedDocument, DomainError (+9 more)

### Community 121 - "useSidebar"
Cohesion: 0.20
Nodes (9): Dialog(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogOverlay(), DialogTitle(), Textarea() (+1 more)

### Community 123 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, paths, files, references

### Community 124 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, paths, files, references

### Community 125 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 127 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 135 - "radix-ui"
Cohesion: 0.21
Nodes (10): reviewDocumentChange(), Card(), CardAction(), CardContent(), CardDescription(), CardFooter(), CardHeader(), CardTitle() (+2 more)

### Community 144 - "@tanstack/react-query"
Cohesion: 0.25
Nodes (4): PopoverContent(), PopoverDescription(), PopoverHeader(), PopoverTitle()

### Community 154 - "react-dom"
Cohesion: 0.38
Nodes (4): ConfidenceBadge(), Entry, FieldMappingRow(), Checkbox()

### Community 155 - "radix-ui"
Cohesion: 0.19
Nodes (10): Change, ChangeCard(), EvidenceRow(), MatchItem, Badge(), badgeVariants, mockCandidate, CandidateFact (+2 more)

### Community 160 - "@radix-ui/react-tabs"
Cohesion: 0.31
Nodes (7): coverLetterDocumentSchema, DocumentChange, documentChangeReviewResponseSchema, documentChangeSchema, DocumentTailorResponse, documentTailorResponseSchema, resumeDocumentSchema

### Community 164 - "badge.tsx"
Cohesion: 0.36
Nodes (5): listProfiles(), selectActiveProfile(), readinessLabel, SidebarProfileSelector(), browser

### Community 173 - "source_preview.py"
Cohesion: 0.16
Nodes (14): Session, upload_document(), execute_operation(), Request, Session, _document_id(), Session, UUID (+6 more)

### Community 174 - "jobs_scheduler.py"
Cohesion: 0.40
Nodes (4): mockDocuments, generatedDocumentsSchema, tailoredChangeSchema, tailoredClassificationSchema

### Community 178 - "shadcn"
Cohesion: 0.33
Nodes (4): Badge(), BadgeProps, badgeVariants, Separator()

### Community 182 - "jobs_scheduler.py"
Cohesion: 0.14
Nodes (14): health(), Session, score_match(), Run a single ATS sync pass and persist results. Safe to call from a     request, run_sync_once(), get_settings(), Settings, _ats_sync_loop() (+6 more)

## Knowledge Gaps
- **627 isolated node(s):** `$schema`, `react`, `typescript`, `oxc`, `react/rules-of-hooks` (+622 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Document Processing Service` to `badge.tsx`, `radix-ui`, `react-dom`, `shadcn`, `Application Store & Result Type`, `useSidebar`, `Fact Review UI Components`, `radix-ui`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `ApiModel` connect `Match Evidence Cards` to `Backend API Endpoints & Errors`, `AI Provider Adapters (Ollama/OpenAI)`, `JobPostingQueryService`, `Repositories & Docling Parsing`, `Profiles API & Common Schemas`, `Match Scoring Pipeline`, `SQLAlchemy Domain Entities`, `source_preview.py`, `Scan & Match Views`, `document.ts`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `cn()` connect `Application Store Actions` to `Source Preview Service`, `dialog.tsx`, `sheet.tsx`, `@tanstack/react-query`, `Document API Client & Profile Setup`, `shadcn/ui Config`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 70 inferred relationships involving `ApiModel` (e.g. with `AgentProvenance` and `AgentRequest`) actually correct?**
  _`ApiModel` has 70 INFERRED edges - model-reasoned connections that need verification._
- **Are the 55 inferred relationships involving `DomainError` (e.g. with `save_ai_preferences()` and `test_provider()`) actually correct?**
  _`DomainError` has 55 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `react`, `typescript` to the rest of the system?**
  _627 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend API Endpoints & Errors` be split into smaller, more focused modules?**
  _Cohesion score 0.11282051282051282 - nodes in this community are weakly interconnected._