# ATS Application Copilot Chrome Extension

## POC Product and Implementation Specification

**Status:** Locked for implementation  
**Version:** 1.1
**Date:** 2026-07-18  
**Primary client:** Chrome extension  
**Implementation strategy:** Three phases, each independently demonstrable

---

## 1. Purpose

Build a Chrome extension that helps a candidate understand a job, compare it with a verified candidate profile, prepare truthful tailored documents, fill an application form, and track the application.

The job portal remains visible in the main browser tab. The extension opens in Chrome's right-side panel and acts as the application assistant. Heavier activities such as profile setup, resume review, A4 preview, and application tracking open in a full-page extension workspace.

This is a proof of concept. The objective is to validate the complete user experience with the smallest maintainable implementation, not to build production infrastructure prematurely.

---

## 2. Locked product decisions

These decisions must not be changed by an implementation agent unless the product owner explicitly changes them.

1. The POC is a Chrome extension, not a standalone user-facing web application.
2. The extension has two surfaces:
   - A right-side panel beside the active job page.
   - A full-page extension workspace for profile setup, A4 document review, and tracking.
3. The extension frontend uses WXT, React, TypeScript, Zustand, shadcn/ui with Radix primitives, and Tailwind CSS v4.
4. shadcn/ui components are owned source code inside the repository. Use a curated component set and customize it through semantic CSS variables; do not treat the default shadcn visual style as the product design system.
5. Profile setup is a one-time activity. The user may:
   - Upload a PDF or DOCX resume.
   - Paste Markdown or plain text.
   - Review and correct normalized facts.
6. YAML is not a user-facing resume format. Internally, use validated JSON.
7. The active job page is the default source of job information. A URL/text-paste fallback remains available.
8. The application journey is:
   - Scan job.
   - Analyze match.
   - Tailor resume and cover letter.
   - Review documents and application answers.
   - Fill approved fields.
   - User performs final submission.
9. The system must never invent candidate facts.
10. Every generated resume statement must reference one or more verified candidate facts.
11. Match scoring is deterministic and explainable. An LLM does not directly choose the final numerical score.
12. Sensitive demographic answers are never inferred.
13. The extension never automatically clicks the final Submit button.
14. Greenhouse is the first ATS-specific adapter. A generic form adapter is also required. Ashby and Workday are later work.
15. Docling is the only document-intelligence library in the POC backend.
16. Do not add OpenDataLoader, Marker, PyMuPDF, pdfplumber, or a second document parser until benchmark evidence justifies it.
17. Do not create unit-test or end-to-end-test suites during the initial POC. Use the manual acceptance checks in this specification.
18. Do not add CI/CD, Kubernetes, Kafka, microservices, a vector database, analytics, billing, or production administration during the POC.
19. The canonical candidate profile, resume, job, match result, fill plan, and application records are validated JSON domain objects. Markdown, plain text, PDF, and DOCX are inputs or renderings, never the source of truth.
20. Zustand manages UI/workflow state in extension surfaces. Chrome storage and IndexedDB remain the durable repositories and synchronization boundary; the service worker and content scripts must not depend on a live React store.
21. An application has a durable `applicationId` and `jobFingerprint`. A Chrome `tabId` is only a temporary browser binding.
22. AI output never manipulates the page directly. Browser filling executes only a validated, user-approved fill plan through an ATS adapter.
23. Job-page content is untrusted input. Sanitize and delimit it before AI use and prevent instructions embedded in a job page from changing system behavior.

---

## 3. Corrected phase plan

The requested three-phase plan is retained with one correction: Phase 2 is not a separate web application. It is the real browser-integration phase for the extension.

| Phase | Outcome | External backend |
| --- | --- | --- |
| Phase 1 | Complete extension UI using mock data | None |
| Phase 2 | Extension reads and fills real job pages using local profile data | None |
| Phase 3 | Docling parsing, scoring, AI tailoring, PDF generation, persistence, and extension integration | Required |

Each phase must be usable and reviewable before the next phase begins.

---

## 4. Instructions for implementation agents

An AI coding agent executing this specification must follow these rules:

1. Work on only one phase at a time.
2. Read the complete specification before editing files.
3. Do not implement later-phase features early.
4. Do not replace the locked technology choices with preferred frameworks.
5. Prefer native browser and platform APIs outside the selected frontend stack.
6. Do not add a runtime dependency that duplicates React, Zustand, shadcn/ui, Tailwind, WXT, Zod, Chrome APIs, or an existing platform capability.
7. Do not create a homegrown component framework, virtual DOM, CSS utility framework, or generalized state-management library.
8. Use feature modules, typed domain contracts, Zustand selectors/actions, and explicit workflow transitions. Components must not set workflow status directly.
9. Keep page-specific ATS logic outside the UI.
10. Never place AI provider secrets in the extension.
11. Never log resume contents, candidate PII, application answers, access tokens, or job-page HTML.
12. Do not store ATS credentials, employer-site cookies, or authenticated browser sessions on the backend.
13. Preserve user control over all generated content and form filling.
14. At the end of a phase, provide:
    - What was implemented.
    - Files changed.
    - How to run it.
    - The manual acceptance checks performed.
    - Known limitations that belong to a later phase.
15. Ask the product owner only when a missing decision materially changes product behavior. Make small implementation decisions independently.

---

## 5. User experience

### 5.1 Full-page extension workspace

The workspace is an extension-owned page, for example:

```text
chrome-extension://<extension-id>/workspace/index.html
```

It contains:

1. **Profile**
   - Upload PDF/DOCX.
   - Paste Markdown/plain text.
   - Display extracted/entered facts.
   - Let the user edit and verify facts.
   - Show profile readiness and last-updated state.

2. **Documents**
   - A4 resume preview.
   - Tailored resume changes.
   - Accept/reject changes.
   - Cover-letter preview.
   - Download generated documents.

3. **Applications**
   - Company, role, ATS, status, score, applied date, and source URL.
   - Statuses: Draft, Ready, Applied, Interview, Offer, Rejected, Withdrawn.

4. **Settings**
   - Reusable answers.
   - Sensitive-question preferences.
   - Data deletion/export entry points.
   - Backend connection state in Phase 3.

### 5.2 Side-panel application assistant

The side panel is the primary application flow and contains five steps:

1. **Scan**
   - Detect job title, company, ATS, description, and form fields.
   - Allow the user to edit the extracted job description.
   - Offer URL/text-paste fallback.

2. **Match**
   - Overall score.
   - Hard requirements.
   - Matched requirements with candidate evidence.
   - Partial matches.
   - Missing and unknown requirements.

3. **Tailor**
   - Suggested resume changes.
   - Cover-letter status.
   - Open A4 review in the full-page workspace.

4. **Fill**
   - Application fields grouped by confidence and status.
   - Fill approved fields only.
   - Request user input for uncertain or sensitive answers.

5. **Confirm**
   - Completion summary.
   - Missing required fields.
   - Document selection.
   - Explicit reminder that the user submits on the portal.

### 5.3 Field confidence behavior

| Field category | Behavior |
| --- | --- |
| High confidence | Preselect for user-approved fill |
| Medium confidence | Show proposed answer and require confirmation |
| Low confidence | Highlight for manual completion |
| Sensitive | Never infer; user must answer or skip |
| Unknown | Leave empty and explain why |

### 5.4 Visual source-of-truth rules

The ASCII mockups below are mandatory layout guidance for implementation agents. They define information hierarchy, primary actions, and expected states. They are not pixel-perfect measurements.

Rules:

1. The employer job page is the real active browser tab. Do not reproduce or iframe it inside the extension.
2. Side-panel designs must work from approximately 360–480 CSS pixels wide.
3. The side panel uses one primary action per step.
4. The five-step journey remains visible near the top of the side panel.
5. Heavy editing opens in the full-page extension workspace.
6. The workspace must remain understandable at a 1024-pixel desktop viewport.
7. A4 preview uses the 210:297 page ratio and clear page boundaries.
8. Match explanations, AI changes, and fill mappings always expose evidence or confidence.
9. Destructive, sensitive, or final actions require explicit user confirmation.
10. Agents may refine spacing and typography but must not remove the information or controls shown here.

Feature-to-mockup index:

| Feature | Mockup section |
| --- | --- |
| Browser split view | 5.5 |
| Side-panel shell | 5.6 |
| Profile-required state | 5.7 |
| Scan job | 5.8 |
| Match analysis | 5.9 |
| Tailor package | 5.10 |
| Fill application | 5.11 |
| Confirm readiness | 5.12 |
| Submission confirmation | 5.13 |
| Workspace navigation | 5.14 |
| Resume upload/paste | 5.15 |
| Candidate fact verification | 5.16 |
| A4 resume review | 5.17 |
| Cover-letter review | 5.18 |
| Application tracker | 5.19 |
| Settings/reusable answers | 5.20 |
| Loading/error/unsupported states | 5.21 |

### 5.5 Browser composition

```text
┌───────────────────────────────────────────────────────┬──────────────────────────────┐
│ ACTIVE EMPLOYER TAB                                   │ JOB COPILOT SIDE PANEL       │
│                                                       │                              │
│ Greenhouse / Ashby / Workday / other application     │ Job summary                  │
│                                                       │ Scan → Match → Tailor         │
│ Job description or application form                  │      → Fill → Confirm         │
│                                                       │                              │
│ First name   [____________________________]           │ Analysis, document review,   │
│ Last name    [____________________________]           │ field mapping, and guidance │
│ Email        [____________________________]           │                              │
│ Resume       [ Choose file ]                          │ [ Fill approved fields ]     │
│                                                       │                              │
│                            [ Submit application ]     │ User submits on the left    │
└───────────────────────────────────────────────────────┴──────────────────────────────┘
```

### 5.6 Side-panel persistent shell

```text
┌──────────────────────────────────────────┐
│ Job Copilot                    [Profile] │
│ Acme · Senior Frontend Engineer          │
│ Greenhouse                     ● Ready   │
├──────────────────────────────────────────┤
│  1 Scan   2 Match   3 Tailor   4 Fill   │
│                              5 Confirm   │
├──────────────────────────────────────────┤
│                                          │
│        CURRENT STEP CONTENT AREA         │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│ Secondary action      [ Primary action ] │
└──────────────────────────────────────────┘
```

The header and step indicator remain stable. Only the current-step content and footer actions change.

### 5.7 Profile-not-ready side-panel state

```text
┌──────────────────────────────────────────┐
│ Job Copilot                              │
├──────────────────────────────────────────┤
│                                          │
│              Profile required            │
│                                          │
│ Add your resume and verify your facts    │
│ before analyzing or filling a job.       │
│                                          │
│ [ Set up profile ]                       │
│                                          │
│ Already started? [Open saved profile]    │
└──────────────────────────────────────────┘
```

### 5.8 Scan-job mockup

```text
┌──────────────────────────────────────────┐
│ 1 Scan                                   │
├──────────────────────────────────────────┤
│ Current page                             │
│ ┌──────────────────────────────────────┐ │
│ │ Senior Frontend Engineer             │ │
│ │ Acme · Remote                        │ │
│ │ careers.greenhouse.io                │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Detected                                 │
│ [✓] Greenhouse  [✓] Job description      │
│ [✓] Application form  [15 fields]        │
│                                          │
│ Job description                          │
│ ┌──────────────────────────────────────┐ │
│ │ We are seeking a senior frontend... │ │
│ │                                      │ │
│ │                              1,842   │ │
│ └──────────────────────────────────────┘ │
│ [Paste text instead]   [Rescan page]     │
├──────────────────────────────────────────┤
│                         [ Analyze job ]  │
└──────────────────────────────────────────┘
```

If the page cannot be read, replace the detected card with URL and text-paste controls. Pasted or edited job text becomes authoritative.

### 5.9 Match-analysis mockup

```text
┌──────────────────────────────────────────┐
│ 2 Match                                  │
├──────────────────────────────────────────┤
│              ┌──────────┐                │
│              │   78%    │                │
│              │  Match   │                │
│              └──────────┘                │
│ Strong experience match; two gaps need  │
│ review before tailoring.                 │
│                                          │
│ Hard gates                         3/3   │
│ [✓] Work authorization                   │
│ [✓] 8+ years experience                  │
│ [✓] Required location                    │
│                                          │
│ Matched requirements              8  [>] │
│ Partial matches                   3  [>] │
│ Missing requirements              2  [>] │
│ Unknown / needs confirmation      1  [>] │
│                                          │
│ Evidence example                         │
│ React leadership                         │
│ ↳ Engineering Manager, Acme, 2021–2024  │
├──────────────────────────────────────────┤
│ [Edit job]                 [ Continue ]  │
└──────────────────────────────────────────┘
```

Expanded requirement rows show the job requirement, candidate evidence, score contribution, and why the item was classified as matched, partial, missing, or unknown.

### 5.10 Tailor-resume mockup

```text
┌──────────────────────────────────────────┐
│ 3 Tailor                                 │
├──────────────────────────────────────────┤
│ Application package                      │
│ ┌──────────────────────────────────────┐ │
│ │ Resume                    5 changes  │ │
│ │ ATS-safe · 2 pages                  │ │
│ │ [ Review A4 resume ]                │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ Cover letter               Drafted  │ │
│ │ 347 words                           │ │
│ │ [ Review cover letter ]             │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Proposed changes                         │
│ [✓] Reorder skills for job relevance     │
│ [ ] Rewrite leadership achievement [>]   │
│ [✓] Move platform project higher         │
│                                          │
│ Every rewrite uses verified facts.       │
├──────────────────────────────────────────┤
│ [Back]                    [Approve set]  │
└──────────────────────────────────────────┘
```

The side panel shows a summary only. Detailed editing occurs in the workspace.

### 5.11 Fill-application mockup

```text
┌──────────────────────────────────────────┐
│ 4 Fill                         12 / 15   │
├──────────────────────────────────────────┤
│ [████████████████████░░░░] 80%           │
│                                          │
│ Ready to fill                     9      │
│ [✓] First name             High          │
│ [✓] Last name              High          │
│ [✓] Email                  High          │
│ [✓] Phone                  High          │
│ [✓] LinkedIn URL           High          │
│                                          │
│ Review answer                       2    │
│ [ ] Salary expectation      Medium  [>]  │
│ [ ] Notice period           Medium  [>]  │
│                                          │
│ Your input required                  3   │
│ [!] Work authorization       Sensitive   │
│ [!] Demographic questions    Sensitive   │
│ [!] Portfolio attachment     Manual      │
│                                          │
│ [ ] Allow overwrite of selected fields  │
├──────────────────────────────────────────┤
│ [Rescan fields]       [Fill 9 approved]  │
└──────────────────────────────────────────┘
```

After filling, each row changes to Filled, Skipped, Failed, or Changed since scan. Failure in one field must not stop the remaining approved fields.

### 5.12 Confirm-application mockup

```text
┌──────────────────────────────────────────┐
│ 5 Confirm                                │
├──────────────────────────────────────────┤
│ Application readiness                    │
│                                          │
│ [✓] 12 fields completed                  │
│ [✓] Tailored resume attached             │
│ [✓] Cover letter attached                │
│ [!]  2 portal questions need your input  │
│ [ ]  Final portal validation             │
│                                          │
│ Documents                                │
│ Resume: Acme-Senior-Frontend.pdf [View]  │
│ Cover:  Acme-Cover-Letter.pdf     [View]  │
│                                          │
│ Next step                                │
│ Complete highlighted fields on the job   │
│ page, review everything, then press the  │
│ portal's Submit application button.      │
│                                          │
│ The extension will not submit for you.   │
├──────────────────────────────────────────┤
│ [Back to fields]        [Mark as ready]  │
└──────────────────────────────────────────┘
```

### 5.13 Submission-detected mockup

```text
┌──────────────────────────────────────────┐
│ Application detected as submitted        │
├──────────────────────────────────────────┤
│ Acme · Senior Frontend Engineer           │
│                                          │
│ The portal displayed a confirmation page │
│ at 14:32 UTC.                            │
│                                          │
│ Was the application submitted?           │
│                                          │
│ [Not submitted]       [Yes, mark applied]│
└──────────────────────────────────────────┘
```

Portal detection suggests the status; the user confirms it.

### 5.14 Workspace shell mockup

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Job Copilot                                                         Profile ready ●    │
├──────────────────┬─────────────────────────────────────────────────────────────────────┤
│                  │                                                                     │
│  Profile         │  PAGE TITLE                                                         │
│  Documents       │  Supporting description or current job context                     │
│  Applications    │                                                                     │
│  Settings        │  ┌───────────────────────────────────────────────────────────────┐  │
│                  │  │                                                               │  │
│                  │  │                    PAGE CONTENT AREA                          │  │
│                  │  │                                                               │  │
│                  │  └───────────────────────────────────────────────────────────────┘  │
│                  │                                                                     │
├──────────────────┴─────────────────────────────────────────────────────────────────────┤
│ Local data status · Last saved 14:25                                      Help · About │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.15 Profile-setup mockup

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Set up your candidate profile                                               │
│ Your resume is uploaded once and converted into facts you can verify.       │
├───────────────────────────────────┬──────────────────────────────────────────┤
│ Upload resume                     │ Paste resume                             │
│                                   │                                          │
│ ┌───────────────────────────────┐ │ Format: [Markdown ▾]                    │
│ │ Drop PDF or DOCX here         │ │ ┌──────────────────────────────────────┐ │
│ │                               │ │ │ # Amit Kumar                         │ │
│ │     [ Choose resume ]         │ │ │ ## Experience                       │ │
│ │                               │ │ │ ...                                  │ │
│ │ Maximum size shown here       │ │ │                                      │ │
│ └───────────────────────────────┘ │ └──────────────────────────────────────┘ │
│                                   │                                          │
│ Selected: amit-resume.pdf         │                          [Use pasted text]│
├───────────────────────────────────┴──────────────────────────────────────────┤
│ Privacy: your resume is used only to build and tailor your candidate profile.│
│                                                         [Continue to review] │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.16 Candidate-fact verification mockup

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Review candidate facts                                     24 of 31 verified│
├─────────────────────────────┬────────────────────────────────────────────────┤
│ Sections                    │ Professional experience                        │
│ [✓] Personal details        │                                                │
│ [!] Summary                 │ Engineering Manager · Acme                     │
│ [!] Experience              │ Mar 2021 – Jun 2024                            │
│ [✓] Education               │ [Edit] [✓ Verified]                            │
│ [✓] Skills                  │                                                │
│ [ ] Projects                │ Achievements                                   │
│                             │ ┌────────────────────────────────────────────┐ │
│                             │ │ Led migration of a multi-tenant platform. │ │
│                             │ │ Source: Page 1 · highlighted region       │ │
│                             │ │ Confidence: High      [Edit] [✓ Verify]   │ │
│                             │ └────────────────────────────────────────────┘ │
│                             │ ┌────────────────────────────────────────────┐ │
│                             │ │ Managed 30 engineers.                     │ │
│                             │ │ Confidence: Low       [Edit] [Reject]     │ │
│                             │ └────────────────────────────────────────────┘ │
├─────────────────────────────┴────────────────────────────────────────────────┤
│ [Save draft]                                      [Finish profile review]   │
└──────────────────────────────────────────────────────────────────────────────┘
```

Unverified facts cannot support generated resume claims.

### 5.17 A4 resume-review mockup

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Tailored resume · Acme Senior Frontend Engineer     5 changes     [Download PDF]       │
├────────────────────────────┬──────────────────────────────────────┬─────────────────────┤
│ Proposed changes           │                                      │ Evidence            │
│                            │          A4 PAGE 1 OF 2              │                     │
│ [✓] Reorder skills         │ ┌──────────────────────────────────┐ │ Job requirement     │
│ [ ] Rewrite achievement    │ │ AMIT KUMAR                       │ │ React leadership    │
│ [✓] Move project           │ │ Engineering Leader               │ │                     │
│                            │ │                                  │ │ Candidate facts     │
│ Selected change           │ │ SUMMARY                          │ │ • fact_014          │
│ Before                    │ │ ...                              │ │ • fact_027          │
│ ┌────────────────────────┐ │ │                                  │ │                     │
│ │ Led frontend work...  │ │ │ EXPERIENCE                       │ │ Confidence: High    │
│ └────────────────────────┘ │ │ Acme · Engineering Manager       │ │                     │
│ After                     │ │ • Led migration...                │ │ [Open source area]  │
│ ┌────────────────────────┐ │ │                                  │ │                     │
│ │ Led platform migr...  │ │ │                                  │ │                     │
│ └────────────────────────┘ │ └──────────────────────────────────┘ │                     │
│ [Reject]      [Accept]     │          [Previous] [Next]           │                     │
└────────────────────────────┴──────────────────────────────────────┴─────────────────────┘
```

On narrower workspace widths, the evidence panel moves below the change list. The A4 page remains the visual focus.

### 5.18 Cover-letter review mockup

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Cover letter · Acme                                      347 words           │
├──────────────────────────────────────────────┬───────────────────────────────┤
│                                              │ Evidence used                 │
│ Dear Hiring Manager,                         │                               │
│                                              │ [✓] Leadership experience     │
│ I am applying for...                         │ [✓] Platform migration        │
│                                              │ [✓] React architecture        │
│ My experience leading...                     │                               │
│                                              │ Tone                          │
│ ...                                          │ (•) Professional              │
│                                              │ ( ) Concise                   │
│                                              │ ( ) Enthusiastic              │
│                                              │                               │
├──────────────────────────────────────────────┴───────────────────────────────┤
│ [Regenerate selected paragraph]        [Save draft] [Approve cover letter]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.19 Application-tracker mockup

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Applications                                    [All statuses ▾] [Search____________]  │
├────────────┬────────────────────────────┬────────────┬────────┬────────────┬─────────────┤
│ Company    │ Role                       │ Status     │ Match  │ Updated    │ Action      │
├────────────┼────────────────────────────┼────────────┼────────┼────────────┼─────────────┤
│ Acme       │ Senior Frontend Engineer   │ Applied    │ 78%    │ Today      │ [Open]      │
│ Globex     │ Engineering Manager        │ Ready      │ 84%    │ Yesterday  │ [Continue]  │
│ Initech    │ Staff UI Engineer          │ Draft      │ 71%    │ 3 days ago │ [Continue]  │
└────────────┴────────────────────────────┴────────────┴────────┴────────────┴─────────────┘
│                                                                                        │
│ Selected application                                                                  │
│ Job URL · Documents used · Timeline · Notes · [Update status ▾]                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.20 Settings and reusable-answers mockup

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Settings                                                                     │
├────────────────────────┬─────────────────────────────────────────────────────┤
│ Reusable answers       │ Application defaults                                │
│ Sensitive questions   │                                                     │
│ Data and privacy       │ Notice period     [30 days_______________________]  │
│ Connection            │ Preferred location[Remote / Bengaluru____________]  │
│                        │ Portfolio URL     [https://______________________]  │
│                        │                                                     │
│                        │ Work authorization                                  │
│                        │ [Ask me for every application ▾]                    │
│                        │                                                     │
│                        │ Demographic questions                               │
│                        │ [Never answer automatically ▾]                      │
│                        │                                      [Save changes] │
└────────────────────────┴─────────────────────────────────────────────────────┘
```

### 5.21 Loading, failure, and unsupported-page states

```text
LOADING                     RECOVERABLE FAILURE            UNSUPPORTED PAGE
┌──────────────────────┐   ┌──────────────────────────┐  ┌──────────────────────────┐
│ Scanning job page... │   │ Could not read this job │  │ No job detected          │
│ [██████░░░░░░░░]     │   │ page completely.       │  │                          │
│                      │   │                          │  │ Open a job page or paste │
│ Reading description │   │ [Paste job text]        │  │ the job description.     │
│ Discovering fields  │   │ [Try again]             │  │                          │
└──────────────────────┘   └──────────────────────────┘  │ [Paste job text]        │
                                                        └──────────────────────────┘
```

Every failure state must provide a manual continuation path when one exists.

---

## 6. Architecture and ownership boundaries

### Extension responsibilities

- Render the side panel and workspace.
- Store local POC profile and preferences.
- Inspect the active job page.
- Detect ATS type.
- Discover and map application fields.
- Insert approved values into the page.
- Display backend analysis and generated documents.
- Detect application confirmation when possible.
- Allow the user to record application status manually.

### Backend responsibilities

- Parse PDF/DOCX resumes using Docling.
- Normalize document output into candidate facts.
- Analyze job requirements.
- Calculate deterministic match scores.
- Generate truth-constrained resume and cover-letter drafts.
- Render A4 HTML and PDF documents.
- Persist profiles, jobs, generated documents, and applications.
- Protect AI credentials and enforce rate limits.

### Employer portal responsibilities

- Authentication.
- Displaying the official application.
- Accepting files and answers.
- Validating portal-required fields.
- Final submission and confirmation.

The backend does not automate the employer portal. Browser interaction remains inside the extension.

### 6.1 High-level system context

```text
                                  ┌──────────────────────────────┐
                                  │          Candidate           │
                                  └──────────────┬───────────────┘
                                                 │ reviews and approves
                         ┌───────────────────────▼────────────────────────┐
                         │                  Chrome                        │
                         │                                                │
                         │  ┌────────────────┐  ┌──────────────────────┐ │
                         │  │ Employer page  │  │ Extension side panel │ │
                         │  └───────┬────────┘  └──────────┬───────────┘ │
                         │          │ DOM                  │ messages     │
                         │  ┌───────▼────────┐  ┌──────────▼───────────┐ │
                         │  │ Content script │◄─┤ Service worker       │ │
                         │  └────────────────┘  └──────────┬───────────┘ │
                         │                                │             │
                         │                     ┌──────────▼───────────┐ │
                         │                     │ Extension workspace │ │
                         │                     └──────────────────────┘ │
                         └────────────────────────────┬──────────────────┘
                                                      │ HTTPS in Phase 3
                                      ┌───────────────▼───────────────┐
                                      │       FastAPI backend         │
                                      └───────┬────────┬────────┬─────┘
                                              │        │        │
                                         Docling   PostgreSQL  AI provider
```

### 6.2 Phase delivery diagram

```text
PHASE 1: UI CONTRACT
Manifest + Side panel + Workspace + Mock data
                         │
                         │ UX accepted
                         ▼
PHASE 2: BROWSER CONTRACT
Content script + Generic adapter + Greenhouse adapter + Local profile + Fill
                         │
                         │ Browser workflow proven
                         ▼
PHASE 3: INTELLIGENCE CONTRACT
Docling + Fact verification + Score + Tailor + PDF + Persistence + Integration
                         │
                         ▼
                   WORKING POC
```

An agent must not skip a phase gate or hide unfinished phase behavior behind future backend work.

### 6.3 Extension runtime diagram

```text
┌──────────────────┐       messages       ┌────────────────────┐
│ Side panel UI    │◄────────────────────►│ Service worker     │
└────────┬─────────┘                      └───────┬────────────┘
         │                                        │
         │ shared local state                     │ tab-scoped messages
         ▼                                        ▼
┌──────────────────┐                      ┌────────────────────┐
│ chrome.storage / │                      │ Content script     │
│ IndexedDB        │                      └───────┬────────────┘
└────────▲─────────┘                              │ selects/reads/fills
         │                                        ▼
         │                               ┌────────────────────┐
┌────────┴─────────┐                     │ ATS application DOM│
│ Workspace UI     │                     └────────────────────┘
└──────────────────┘
```

The side panel and workspace never directly manipulate the employer page. They request tab operations through the service worker/content-script boundary.

Zustand is an in-memory projection for each React surface, not a cross-context database. A repository layer persists durable checkpoints and publishes changes through Chrome messaging/storage events. Service-worker suspension or closing a tab must not destroy an application record.

### 6.3.1 Frontend state and persistence boundaries

```text
React + shadcn/ui
        │ selectors and actions
        ▼
Zustand UI/workflow store
        │
        ├── profileSlice
        ├── jobSlice
        ├── applicationSlice
        ├── documentSlice
        └── uiSlice
        │ durable checkpoints
        ▼
SessionRepository / DocumentRepository
        │
        ├── chrome.storage.local: metadata, workflow, preferences, event log
        └── IndexedDB: original resumes, drafts, generated files, larger payloads
```

Persistence rules:

- Use schema versions and explicit migrations for persisted records.
- Persist domain records and workflow checkpoints, not loading spinners, open dialogs, transient errors, or derived display state.
- Never persist raw page HTML, employer credentials, cookies, AI secrets, or sensitive logs.
- Use selectors so React components subscribe only to the state they consume.
- Components invoke domain actions such as `scanJob`, `analyzeMatch`, `approveResume`, and `executeFillPlan`; they do not write arbitrary workflow states.
- Backend response caching remains outside Zustand. If Phase 3 needs client-side request caching/retries, add TanStack Query then; do not add it during Phases 1–2.

### 6.3.2 Application identity and recoverability

```text
applicationId   durable workflow identity
jobFingerprint  normalized company + title + location + canonical URL
tabId           temporary binding to the currently open browser tab
requestId       one cross-context operation
```

Create or locate the durable application by `jobFingerprint`, then attach the active `tabId`. A closed/reopened browser tab receives a new binding without creating a duplicate application. Record significant events including `JOB_CAPTURED`, `SCORE_COMPLETED`, `RESUME_GENERATED`, `RESUME_APPROVED`, `FORM_INSPECTED`, `FIELD_FILLED`, and `USER_SUBMITTED`.

### 6.4 Resume ingestion and verification diagram

```text
PDF / DOCX upload
        │
        ▼
File validation ───── invalid ────► Clear user error
        │ valid
        ▼
Original document storage
        │
        ▼
Docling parse
        │
        ├──► Lossless Docling JSON + parser/model version
        │
        ▼
Neutral ParsedDocument
        │
        ▼
Resume normalizer
        │
        ▼
Candidate facts + page/bounding-box evidence + confidence
        │
        ▼
Candidate verification
        │
        ├── rejected/corrected ───► Versioned fact update
        │
        ▼
Verified candidate fact graph
```

### 6.5 Job analysis and scoring diagram

```text
Active job page
      │
      ├── JSON-LD JobPosting
      ├── ATS adapter extraction
      └── User-edited/pasted description
                         │
                         ▼
                 Normalized job
                         │
                         ▼
              Requirement extraction
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
         Hard gates   Skills     Experience/
                                 responsibilities
             └───────────┼───────────┘
                         ▼
              Deterministic weights
                         │
                         ▼
      Score + component scores + evidence + gaps
```

The AI provider may help normalize requirements, but the deterministic scoring module owns the final number.

### 6.6 Tailoring safety diagram

```text
Job requirement
       │
       ▼
Retrieve relevant VERIFIED candidate facts
       │
       ├── no supporting fact ───► Mark gap; do not generate claim
       │
       ▼
Generate proposed rewrite
       │
       ▼
Validate sourceFactIds and output schema
       │
       ├── invalid/unsupported ──► Reject proposal
       │
       ▼
Show before + after + reason + evidence
       │
       ├── user rejects ─────────► Preserve original
       │
       ▼ user accepts
Approved Resume JSON ───► Shared HTML/CSS ───► A4 preview + PDF
```

### 6.7 Safe browser-fill diagram

```text
Discover visible application fields
              │
              ▼
Create field descriptors
              │
              ▼
Build proposed fill plan from verified facts / reusable answers
              │
      ┌───────┼───────────┬────────────┐
      ▼       ▼           ▼            ▼
    High    Medium        Low       Sensitive
      │       │           │            │
 preselect  confirm     manual      explicit user
      └───────┴───────────┴────────────┘
                      │
                      ▼
            Review value + source + confidence
                      │
                      ▼
           User-approved immutable fill plan
                      │
                      ▼
          Revalidate field still exists
                      │
                      ▼
       Fill + dispatch input/change/blur
                      │
                      ▼
       Filled / skipped / failed report
                      │
                      ▼
             User reviews and submits
```

Neither an AI provider nor a React component may call an ATS adapter directly. The service worker accepts only a schema-validated fill plan, verifies that the plan was approved, and delegates execution to the selected adapter. Low-confidence, sensitive, legal, demographic, disability, veteran-status, work-authorization, and sponsorship answers always require explicit review.

### 6.8 High-level data relationships

```text
Profile
  ├── Source documents
  │      └── Parse runs
  └── Verified candidate facts
             │
             ├──────────────┐
             │              │
             ▼              ▼
Job ───► Match result    Generated documents
  │          │              │
  └──────────┴──────┬───────┘
                    ▼
               Application
                    │
                    └── Status timeline / confirmation
```

### 6.9 Backend processing boundary

```text
SYNCHRONOUS POC PATH

Extension ──HTTPS──► FastAPI route ──► Domain service ──► Result
                                         │
                                         ├── Docling converter loaded once
                                         ├── Deterministic scorer
                                         ├── AI provider adapter
                                         └── HTML/PDF renderer

LATER, ONLY IF MEASURED LATENCY REQUIRES IT

FastAPI route ──► OperationService ──► Durable queue ──► Worker
```

The POC must keep an `OperationService` boundary but must not add a durable queue before it is needed.

### 6.10 Trust boundaries and page-content safety

- Treat job descriptions, labels, hidden DOM text, JSON-LD, and application questions as untrusted data, never as instructions.
- Extract only the minimum page content required for the active operation.
- Sanitize content and place it in explicit data fields before sending it to the backend or AI provider.
- Backend prompts must delimit page content and state that embedded instructions are data to analyze, not commands to follow.
- Request optional host permissions only when the user initiates analysis or enables a supported portal.
- The extension must not collect credentials or automatically handle CAPTCHA, login, consent, demographic disclosure, legal attestation, or final submission.

---

## 7. Repository structure

Create directories only when their phase begins.

```text
project/
├── extension/
│   ├── wxt.config.ts
│   ├── components.json
│   ├── entrypoints/
│   │   ├── background.ts
│   │   ├── content.ts
│   │   ├── sidepanel/
│   │   └── workspace/
│   ├── components/
│   │   ├── ui/                 # Curated shadcn source
│   │   ├── resume/
│   │   ├── scoring/
│   │   └── application/
│   ├── features/
│   │   ├── profile/
│   │   ├── job-analysis/
│   │   ├── tailoring/
│   │   ├── application-fill/
│   │   └── tracking/
│   ├── stores/
│   │   ├── application-store.ts
│   │   ├── slices/
│   │   └── selectors.ts
│   ├── repositories/
│   │   ├── session-repository.ts
│   │   └── document-repository.ts
│   ├── adapters/
│   │   ├── generic/
│   │   └── greenhouse/
│   ├── messaging/
│   ├── schemas/
│   ├── mock/
│   ├── styles/
│   │   └── globals.css
│   └── assets/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/
│   │   ├── models/
│   │   ├── profiles/
│   │   ├── documents/
│   │   ├── jobs/
│   │   ├── scoring/
│   │   ├── tailoring/
│   │   ├── applications/
│   │   ├── ai/
│   │   └── storage/
│   ├── migrations/
│   ├── requirements.txt
│   └── .env.example
├── shared/
│   ├── schemas/
│   └── examples/
└── README.md
```

Phase 1 creates the WXT extension, React surfaces, curated UI components, stores, mock data, and `README.md`. Phase 2 adds the real content script, repositories, messaging, and ATS adapters. Phase 3 creates `backend/` and shared schemas.

---

## 8. Canonical data contracts

The examples below define required shapes, not every final field. Unknown fields should be `null` or omitted; never fabricate values.

### 8.1 Candidate profile

```json
{
  "id": "profile_001",
  "personal": {
    "fullName": "",
    "email": "",
    "phone": "",
    "location": "",
    "links": []
  },
  "summary": "",
  "skills": [],
  "experience": [],
  "education": [],
  "projects": [],
  "certifications": [],
  "preferences": {},
  "reusableAnswers": {},
  "verification": {
    "status": "unverified",
    "verifiedFactIds": []
  }
}
```

Every normalized fact must have:

```json
{
  "id": "fact_001",
  "type": "experience.achievement",
  "value": "Led migration of a multi-tenant frontend platform",
  "source": {
    "documentId": "document_001",
    "page": 1,
    "bbox": [42, 280, 548, 330],
    "elementIds": ["docling_element_14"]
  },
  "confidence": 0.95,
  "verified": true
}
```

### 8.2 Job

```json
{
  "id": "job_001",
  "jobFingerprint": "sha256:normalized-company-title-location-url",
  "canonicalUrl": "",
  "sourceUrl": "",
  "ats": "greenhouse",
  "title": "",
  "company": "",
  "location": "",
  "description": "",
  "requirements": [],
  "applicationFields": []
}
```

### 8.3 Match result

```json
{
  "jobId": "job_001",
  "profileId": "profile_001",
  "score": 78,
  "scoringVersion": "poc-v1",
  "components": [],
  "hardGates": [],
  "matched": [],
  "partial": [],
  "missing": [],
  "unknown": [],
  "recommendations": []
}
```

### 8.4 Fill plan

```json
{
  "id": "fill_plan_001",
  "applicationId": "application_001",
  "schemaVersion": 1,
  "status": "proposed",
  "approvedAt": null,
  "entries": [
    {
      "fieldId": "portal_field_12",
      "label": "Are you authorized to work in this country?",
      "type": "select",
      "required": true,
      "proposedValue": null,
      "sourceFactIds": [],
      "confidence": 0,
      "sensitivity": "work_authorization",
      "requiresReview": true,
      "status": "needs_user_input"
    }
  ]
}
```

Once approved, the fill plan is immutable. Editing a value creates a new proposed version that must be approved again.

### 8.5 Tailored document change

```json
{
  "id": "change_001",
  "section": "experience",
  "operation": "rewrite",
  "before": "",
  "after": "",
  "sourceFactIds": ["fact_001"],
  "classification": "REPHRASED",
  "reason": "Align verified experience with a stated job requirement",
  "status": "pending_review"
}
```

### 8.6 Application

```json
{
  "id": "application_001",
  "jobId": "job_001",
  "jobFingerprint": "sha256:normalized-company-title-location-url",
  "activeTabId": null,
  "status": "draft",
  "matchResultId": "match_001",
  "resumeDocumentId": null,
  "coverLetterDocumentId": null,
  "submittedAt": null,
  "confirmation": null,
  "events": [
    {
      "id": "event_001",
      "type": "JOB_CAPTURED",
      "occurredAt": "2026-07-18T00:00:00Z",
      "metadata": {}
    }
  ]
}
```

### 8.7 Tailoring classifications

Every proposed change is classified as one of:

- `REPHRASED`: wording changed without changing meaning.
- `REORDERED`: verified content moved for relevance.
- `EMPHASIZED`: existing evidence made more prominent.
- `REMOVED`: content omitted from this tailored version.
- `NEW_CLAIM`: proposed content not directly supported by verified facts; reject by default and never silently include.

### 8.8 Workflow invariants

- Durable domain IDs do not depend on a Chrome tab ID.
- Every generated factual statement references verified `sourceFactIds`.
- Every score contribution references job evidence and candidate evidence or an explicit gap.
- Every filled value belongs to an approved fill-plan version.
- Every cross-context mutation has a unique request/idempotency key.
- Final submission remains a user action.

---

# Phase 1: Extension UI with mock data

## 9. Phase 1 goal

Deliver a loadable Manifest V3 Chrome extension containing the complete side-panel and full-page workspace experience. All data is local mock data. There is no backend, job-page reading, AI call, PDF parsing, or form filling.

The product owner must be able to click through the complete intended journey and approve the UX before browser integration begins.

## 10. Phase 1 implementation scope

### 10.1 Manifest and extension entry points

Implement:

- Manifest V3.
- `sidePanel` permission.
- `storage` permission only if needed for UI preferences.
- Toolbar action opens/toggles the side panel.
- Workspace opens in a new extension tab from side-panel actions.

Do not request `activeTab`, `scripting`, `tabs`, host permissions, or debugger permission in Phase 1.

### 10.2 React UI foundation

Use:

- WXT for Manifest V3 entry points, development, and packaging.
- React and TypeScript for the side panel and workspace.
- Zustand slices for UI/workflow state, with typed selectors and domain actions.
- Zod schemas at storage, messaging, mock-data, and API boundaries.
- Semantic HTML and accessible shadcn/ui components using Radix primitives.
- Local React state for isolated component details; do not put every input keystroke or open/closed control into Zustand.

Keep service-worker, content-script, repository, message-contract, domain-schema, and ATS-adapter code framework-independent TypeScript. Do not import React components into those layers.

### 10.3 shadcn/ui and CSS design system

Configure Tailwind CSS v4 and define semantic CSS-variable tokens for:

- Neutral, primary, success, warning, and danger colors.
- Typography scale.
- Spacing scale.
- Border radii.
- Border and shadow styles.
- Focus ring.
- A4 measurements.
- Match states: strong, partial, missing, and unknown.
- Resume paper and preview canvas.

Add only the shadcn/ui source components required by the screens:

- Button.
- Icon button.
- Input, textarea, select, checkbox, and radio.
- Card.
- Badge.
- Alert.
- Step indicator.
- Progress bar.
- Score ring or score bar.
- Tabs.
- Dialog.
- Empty state.
- Skeleton/loading state.
- Field-mapping row.
- A4 page.

Use the shadcn Sidebar component only in the full-page workspace if helpful. The Chrome side panel uses a purpose-built narrow shell rather than nesting a desktop sidebar inside the browser side panel. The interface must remain usable at a narrow width and must have visible keyboard focus states.

Do not install a separate component suite or styling framework. Product-specific components such as the step indicator, score display, field-mapping row, and A4 page are composed from the curated primitives and project tokens.

### 10.4 Zustand workflow model

Represent the application journey with a discriminated status such as:

```ts
type ApplicationStatus =
  | "idle"
  | "job_detected"
  | "analyzing"
  | "scored"
  | "tailoring"
  | "reviewing"
  | "ready_to_fill"
  | "filling"
  | "awaiting_submission"
  | "completed"
  | "failed";
```

Only store actions may perform legal transitions. Phase 1 uses a mock repository implementing the same interface that Phase 2 will back with Chrome storage and IndexedDB.

### 10.5 Mock data

Provide one complete mock candidate, one mock software-engineering job, one match result, one tailored resume, one cover letter, field mappings, and several application records.

The mock candidate must not contain real personal data.

### 10.6 Side-panel interactions

The user must be able to:

- Move through Scan, Match, Tailor, Fill, and Confirm.
- Edit the mock job description.
- Expand matched/missing requirement groups.
- Approve or reject mock resume changes.
- Approve individual field mappings.
- Enter a missing answer.
- Open the workspace A4 preview.
- Simulate fill completion without touching the active page.
- Simulate a recoverable error and retry state.

### 10.7 Workspace interactions

The user must be able to:

- Switch among Profile, Documents, Applications, and Settings.
- Choose upload or paste-resume setup.
- Paste Markdown/plain text into an editor.
- See a mock extracted-facts review.
- Edit and mark facts as verified.
- View a paginated A4 resume preview.
- Review accepted/rejected changes.
- View a mock cover letter.
- View and filter application records.

File selection may be captured in UI state but must not be parsed.

## 11. Phase 1 acceptance gate

Phase 1 is complete when all of the following are manually verified:

- The unpacked extension loads without manifest errors.
- Clicking the toolbar icon opens the side panel.
- The side panel remains visually usable at its narrowest practical width.
- All five assistant steps can be completed using mock data.
- The workspace opens in a new extension tab.
- Profile, Documents, Applications, and Settings screens are reachable.
- The A4 preview visually resembles a resume page and does not overflow its page container.
- Approve/reject and field-selection interactions update the visible UI.
- Refreshing either surface does not produce a broken state.
- No network request is made.
- The selected frontend stack is limited to WXT, React, TypeScript, Zustand, shadcn/ui/Radix, Tailwind CSS v4, Zod, and their required build/runtime dependencies.
- Workflow transitions occur through Zustand actions and survive a surface refresh through the Phase 1 mock repository where specified.

## 12. Phase 1 explicitly out of scope

- Reading the active page.
- Parsing an uploaded resume.
- Real match scoring.
- AI generation.
- PDF creation.
- Filling portal fields.
- Backend or database.
- User authentication.
- Test frameworks.

---

# Phase 2: Browser integration and local workflow

## 13. Phase 2 goal

Connect the approved extension UI to the active browser tab. The extension must detect a job page, extract job and form information, store a local candidate profile, map common fields, and fill user-approved fields without a backend.

This phase proves the extension's core technical differentiator.

## 14. Phase 2 implementation scope

### 14.1 Permissions

Add only:

- `activeTab`.
- `scripting`.
- Optional host permissions requested when the user chooses **Analyze this job** or enables a portal.

Do not request global host access as a required install-time permission.

### 14.2 Extension messaging

Use a serializable message envelope:

```json
{
  "type": "DISCOVER_FIELDS",
  "requestId": "request_001",
  "schemaVersion": 1,
  "source": "sidepanel",
  "destination": "content",
  "tabId": 123,
  "payload": {}
}
```

Responses use:

```json
{
  "requestId": "request_001",
  "ok": true,
  "data": {},
  "error": null
}
```

Required message types:

- `SCAN_PAGE`.
- `PAGE_SCAN_RESULT`.
- `DISCOVER_FIELDS`.
- `FIELD_DISCOVERY_RESULT`.
- `FILL_APPROVED_FIELDS`.
- `FIELD_FILL_RESULT`.
- `GET_ACTIVE_CONTEXT`.
- `APPLICATION_CONFIRMATION_DETECTED`.

Validate messages at both ends with shared Zod schemas. Every request has a timeout, structured error code, and correlation by `requestId`. Mutating operations also carry an idempotency key so reconnects or retries do not fill a field twice. Do not send raw DOM nodes or the entire page HTML through extension messaging.

### 14.3 Page scan

Extract:

- URL and hostname.
- ATS detection signals.
- JSON-LD `JobPosting`, when present.
- Job title.
- Company.
- Location.
- Job description.
- Form-field descriptors.

The edited job description in the side panel becomes authoritative.

### 14.4 ATS adapter contract

Implement a capability-based adapter contract:

```ts
interface AtsAdapter {
  readonly id: string;
  detect(context: PageContext): boolean;
  capabilities(): AdapterCapabilities;
  extractJob(context: PageContext): Promise<Job>;
  inspectForm(context: PageContext): Promise<FormSchema>;
  fillField(field: FieldDescriptor, value: unknown): Promise<FieldFillResult>;
  detectConfirmation(context: PageContext): Promise<ConfirmationResult>;
}
```

Capabilities include file upload, multi-page form support, custom questions, login requirement, confirmation detection, and whether safe assisted filling is available. Unsupported capabilities must degrade to clear manual instructions, not guessed automation.

Implement:

1. `GenericAdapter`
   - Uses labels, ARIA attributes, input types, names, autocomplete attributes, nearby text, and form structure.

2. `GreenhouseAdapter`
   - Uses Greenhouse-specific detection and selectors only inside the adapter.

The UI must not contain ATS-specific selectors.

### 14.5 Field descriptors

Each discovered field should include:

- Stable page-local identifier.
- Label/question text.
- Element type.
- Required state.
- Options for select/radio fields.
- Current value.
- Visibility and enabled state.
- ATS adapter.
- Confidence metadata.

### 14.6 Filling behavior

- Build a proposed fill plan before manipulating the page. Each entry includes the field, proposed value, source fact/reusable answer, confidence, sensitivity classification, and review requirement.
- Show the plan to the user and execute only an immutable approved version.
- Fill only fields present in that approved plan.
- Recheck that a field still exists before filling.
- Dispatch the input/change/blur events required by modern form frameworks.
- Never overwrite a non-empty field without explicit approval.
- Report filled, skipped, failed, and changed-since-scan fields.
- Never click final Submit.
- File upload may use the locally stored resume file where Chrome and the portal allow it. Otherwise highlight the upload field and request manual completion.
- AI output, UI components, and Zustand actions cannot directly access page elements; execution crosses the validated service-worker/content-script/adapter boundary.

### 14.7 Local profile

Until Phase 3 parsing exists:

- Support direct Markdown/plain-text paste.
- Provide editable structured profile fields for common application values.
- Store lightweight profile data in `chrome.storage.local`.
- Store uploaded file bytes and larger drafts in IndexedDB.
- PDF/DOCX upload is stored but marked **Parsing available after backend connection**.
- Validate storage records with Zod, include `schemaVersion`, and run explicit migrations when the schema changes.
- Keep transient UI state in memory; do not persist loading flags, open dialogs, or raw page content.

### 14.8 Local preview scoring

Implement a clearly labeled local preview score using simple deterministic keyword coverage. Its only purpose is to exercise the Match UI. It must be replaced by the Phase 3 scoring engine and must not be presented as a production-quality ATS score.

### 14.9 Application tracking

Create/update a local application record when a job is scanned. Let the user manually mark it Applied. If a clear portal confirmation is detected, suggest the status change and require confirmation.

Generate a durable `applicationId` and normalized `jobFingerprint`; bind the active `tabId` only for the current browser session. Append meaningful application events so a reopened tab can resume the workflow and duplicate scans can be detected.

## 15. Phase 2 acceptance gate

Phase 2 is complete when manually verified that:

- The extension requests access only after the user initiates analysis.
- The current page can be scanned.
- A job title, company, description, and ATS type are displayed or can be corrected.
- Generic form fields are discovered with understandable labels.
- A Greenhouse-hosted application is recognized by the Greenhouse adapter.
- Name, email, phone, location, and one reusable answer can be mapped from the local profile.
- Approved empty fields are filled.
- The user can inspect source, confidence, and review status before approving a fill plan.
- Existing non-empty fields are not silently overwritten.
- Unknown and sensitive questions remain for the user.
- Dynamic field changes do not crash the side panel.
- The final Submit control is never triggered.
- A local application record is created.
- Closing and reopening the job in a new tab can reconnect to the durable application record.
- Replaying the same approved fill request does not duplicate the operation.
- The extension remains functional without any backend.

## 16. Phase 2 explicitly out of scope

- Accurate PDF/DOCX parsing.
- LLM calls.
- Production match scoring.
- Truth-constrained resume rewriting.
- Generated PDF upload.
- Ashby and Workday adapters.
- Portal account creation or login automation.
- CAPTCHA handling.
- Final automatic submission.

---

# Phase 3: Backend and full integration

## 17. Phase 3 goal

Add the minimum backend needed to turn the locally functional extension into the complete POC: resume parsing, candidate fact verification, job analysis, deterministic scoring, AI tailoring, A4/PDF generation, and persisted application records.

## 18. Backend technology

Use:

- Python.
- FastAPI.
- Pydantic.
- Docling.
- PostgreSQL.
- SQLAlchemy and Alembic.
- A local filesystem storage adapter for development.
- An S3-compatible storage adapter boundary for later deployment.
- Playwright Python for final PDF rendering.
- One configurable AI provider implementation behind an internal provider interface.

Do not add Celery/Redis for the first working backend. Keep long-running operations behind an `OperationService` interface so a durable worker can be introduced if synchronous processing becomes disruptive. Initialize Docling once per backend worker/process rather than once per request.

## 19. Backend modules

### 19.1 Profiles

- Create and update profiles.
- Accept user corrections.
- Mark facts verified/unverified.
- Return a profile-readiness summary.

### 19.2 Document ingestion

- Accept PDF and DOCX uploads.
- Validate extension, MIME type, size, and basic signature.
- Store the original document.
- Parse using Docling only.
- Store lossless Docling JSON for debugging/reprocessing.
- Convert Docling output into the neutral `ParsedDocument` contract.
- Normalize into candidate facts with source evidence.
- Return uncertain facts for review.

Do not use exported Markdown as the canonical parsed representation.

### 19.3 Docling adapter

Implement a parser-neutral boundary:

```python
class DocumentParser(Protocol):
    def parse(self, source: Path) -> ParsedDocument:
        ...
```

`DoclingParser` maps Docling items into:

- Element ID.
- Element type.
- Text.
- Page number.
- Bounding box.
- Reading order.
- Parent/child relationships.
- Provenance.
- Parser and model versions.

Use Docling's standard PDF pipeline for digital PDFs. Enable OCR only for scanned/image-heavy documents or when extracted-text quality is low. Use Docling's DOCX pipeline for DOCX files.

### 19.4 Job analysis

- Accept the extension's edited job text and structured page metadata.
- Normalize title, company, location, and employment type.
- Extract responsibilities.
- Extract required and preferred qualifications.
- Identify years of experience and hard gates.
- Preserve text evidence for each requirement.
- Treat all received page text as untrusted content. Strip irrelevant markup, delimit source content in prompts, and ignore any instructions embedded in that content.

### 19.5 Scoring

Implement configurable deterministic scoring. Initial default weights:

| Component | Weight |
| --- | ---: |
| Hard requirements | 20 |
| Required skills | 30 |
| Relevant experience | 20 |
| Responsibilities | 15 |
| Seniority/title | 5 |
| Education/certifications | 5 |
| Semantic alignment | 5 |

Rules:

- The score is 0–100.
- Every component returns its own score and evidence.
- Missing and unknown are distinct.
- A hard-gate failure is visible and cannot be hidden by keyword matches.
- All scoring results include `scoringVersion`.
- The AI provider may normalize requirements but cannot directly set the final score.

Expose the score as explainable dimensions rather than a single opaque ATS prediction:

- Required and preferred skill coverage.
- Relevant experience and date-derived years.
- Responsibilities and domain evidence.
- Education and certification constraints.
- Semantic relevance.
- Resume parser/readability checks.
- Unsupported-claim and hard-gate warnings.

Each awarded or missing point must link to job evidence and verified candidate evidence. The UI must label the result as this product's explainable match score, not claim to reproduce an employer ATS's private ranking algorithm.

### 19.6 AI provider

Create one internal interface for:

- Job requirement extraction assistance.
- Candidate fact normalization assistance.
- Resume tailoring.
- Cover-letter generation.
- Drafting non-sensitive application answers.

Requirements:

- AI calls occur only on the backend.
- Output must conform to a Pydantic/JSON schema.
- Resume changes require verified `sourceFactIds`.
- Unsupported claims are rejected before reaching the client.
- Prompts and model configuration are versioned.
- Provider credentials come from environment variables.
- Job-page and resume content is data, not authority. Prompt templates delimit untrusted inputs and prohibit following embedded instructions.
- Send only the minimum fields needed for the operation and do not include browser cookies, credentials, or unrelated candidate PII.

### 19.7 Tailoring

Generate:

- Proposed resume changes.
- Change reason.
- Source fact IDs.
- Before/after content.
- Confidence.
- User-review status.
- Cover-letter draft.
- A change classification: `REPHRASED`, `REORDERED`, `EMPHASIZED`, `REMOVED`, or `NEW_CLAIM`.

The model may rephrase, reorder, emphasize, or omit verified content. It may not invent employers, dates, skills, degrees, certifications, responsibilities, metrics, or outcomes. Reject `NEW_CLAIM` unless a verified fact directly supports it and it is reclassified accordingly. Do not automatically apply changes. The user reviews a before/after diff, evidence, and reason, then accepts or rejects each material change in the extension.

### 19.8 A4 preview and PDF

The backend creates a sanitized HTML/CSS resume representation from approved Resume JSON.

Use the exact same generated HTML/CSS for:

- The extension's sandboxed A4 preview.
- Playwright PDF generation.

This avoids preview/PDF drift. Use a single ATS-safe template in the POC. The generated PDF must be downloadable and available to the extension for supported file-upload fields.

### 19.9 Applications

Persist:

- Job.
- Match result.
- Approved document versions.
- Application status.
- Portal URL and ATS.
- User-confirmed submission timestamp.
- Confirmation metadata when available.

Do not persist employer-site cookies or credentials.

## 20. Minimum API

Exact paths may be adjusted consistently, but these capabilities are required:

```text
GET    /health
POST   /profiles
GET    /profiles/{profile_id}
PATCH  /profiles/{profile_id}
POST   /profiles/{profile_id}/documents
POST   /profiles/{profile_id}/facts/verify
POST   /jobs/analyze
POST   /matches/score
POST   /documents/tailor
POST   /documents/{document_id}/approve
GET    /documents/{document_id}/preview
GET    /documents/{document_id}/pdf
POST   /applications
PATCH  /applications/{application_id}
GET    /applications
GET    /operations/{operation_id}
```

Use consistent error responses:

```json
{
  "error": {
    "code": "DOCUMENT_PARSE_FAILED",
    "message": "The resume could not be parsed.",
    "retryable": true,
    "details": {}
  }
}
```

## 21. Minimum database entities

- `profiles`.
- `source_documents`.
- `parse_runs`.
- `profile_facts`.
- `jobs`.
- `job_requirements`.
- `match_results`.
- `generated_documents`.
- `document_changes`.
- `applications`.
- `application_events`.
- `fill_plans`.
- `operations`.

Store flexible parser metadata in JSONB, but keep commonly queried identifiers, statuses, timestamps, and relationships in typed columns.

## 22. Extension/backend integration

Replace Phase 2 placeholders in this order:

1. Connect profile upload and parsing.
2. Connect fact verification.
3. Send the edited job description for analysis.
4. Replace local preview score with backend score.
5. Connect tailoring and document review.
6. Load backend-generated A4 HTML preview.
7. Download/upload approved PDF where supported.
8. Synchronize application records.

The extension must retain a readable error state and allow manual continuation when the backend is unavailable.

At this phase, TanStack Query may be added for backend request state, caching, retries, and invalidation. Zustand continues to own local workflow/UI state; do not copy the server cache into Zustand. Persisted application/domain records still pass through repository interfaces.

For the local POC, use a development bearer token or equivalent minimal protection. Full user authentication and multi-device accounts are post-POC work.

## 23. Phase 3 acceptance gate

Phase 3 is complete when the following complete journey is manually demonstrated:

1. Load the extension.
2. Upload one PDF or DOCX resume.
3. Docling parses it.
4. The user reviews and verifies candidate facts.
5. Open a supported job page.
6. The extension extracts the job and application fields.
7. The backend returns an explainable match score.
8. The backend proposes truthful resume changes with source fact IDs.
9. The user accepts/rejects changes.
10. The A4 preview renders correctly.
11. The generated PDF downloads successfully.
12. The extension fills approved application fields.
13. Sensitive or unknown fields remain under user control.
14. The extension does not click Submit.
15. The user records or confirms the application as Applied.
16. The application appears in the tracker with the correct job and document versions.

Also verify:

- No AI secret exists in extension source or storage.
- No invented resume fact appears in generated content.
- Backend failure produces a recoverable UI state.
- A refresh does not lose a completed profile or tracked application.
- A reopened job reconnects to its durable application by fingerprint without depending on the old tab ID.
- The executed fields exactly match the approved fill-plan version.
- A job page containing instruction-like text cannot alter system policy, expose secrets, or bypass truth/review constraints.

## 24. Phase 3 explicitly out of scope

- Production authentication and billing.
- Team or recruiter accounts.
- Mobile clients.
- Cross-browser support.
- Automated final submission.
- CAPTCHA bypass.
- Workday-specific automation.
- Multi-template resume marketplace.
- Recommendation feeds or job discovery.
- Dedicated vector database.
- Durable distributed queues unless measured latency requires them.
- Automatic migration to OpenDataLoader.

---

## 25. POC definition of done

The POC is done only when the Phase 3 acceptance journey works end to end. A visually complete UI without page integration is not the completed POC. A working backend without extension-controlled field filling is also not the completed POC.

The POC must prove these four hypotheses:

1. The extension can reliably understand enough of a real job page to assist the user.
2. The match explanation is useful and believable.
3. Truth-constrained tailoring produces a document the user is willing to submit.
4. Review-before-fill saves meaningful time without removing user control.

---

## 26. Post-POC decision triggers

Add technology only in response to measured need:

| Trigger | Possible addition |
| --- | --- |
| Docling reading-order failures on resume corpus | Benchmark OpenDataLoader |
| Parsing/AI requests block API responsiveness | Add Celery and Redis |
| Multiple devices/accounts required | Production OAuth/OIDC and cloud synchronization |
| Semantic scoring measurably improves outcomes | PostgreSQL pgvector |
| Ashby volume justifies support | Add Ashby adapter |
| Workday demand justifies maintenance | Build an assisted Workday adapter |
| High document volume | Independently scale parser/render workers |

---

## 27. Required handoff after every phase

Use this exact structure:

```text
Phase completed:

Implemented:
- ...

Files changed:
- ...

Run instructions:
1. ...

Manual checks performed:
- ...

Known limitations deferred to next phase:
- ...
```

Do not describe deferred scope as a defect when it is explicitly assigned to a later phase.

---

## 28. Reference documentation

- WXT: https://wxt.dev/
- React: https://react.dev/
- Zustand: https://zustand.docs.pmnd.rs/
- shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/docs
- Zod: https://zod.dev/
- TanStack Query: https://tanstack.com/query/latest
- Chrome Side Panel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- Chrome content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome permissions: https://developer.chrome.com/docs/extensions/reference/api/permissions
- Docling: https://github.com/docling-project/docling
- Docling document model: https://docling-project.github.io/docling/concepts/docling_document/
- FastAPI: https://fastapi.tiangolo.com/
- Pydantic: https://docs.pydantic.dev/
- Playwright Python: https://playwright.dev/python/
