# Docling Text Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display page-grouped Docling text beside the rendered resume on the Profile page.

**Architecture:** Extend the existing source-preview response rather than introduce a second request. Build page text from the stored neutral Docling representation, then render it in a focused extension component sharing page state with the A4 preview.

**Tech Stack:** FastAPI, Pydantic, Python, React, TypeScript, Zod, WXT.

---

### Task 1: Source-preview contract

**Files:**
- Modify: `backend/app/models/source_preview.py`
- Modify: `backend/app/documents/source_preview.py`
- Test: `backend/scripts/smoke_docling.py`

- [x] Add failing smoke assertions for parser metadata, element count, and page text.
- [x] Run the Docling smoke test and confirm the response-contract failure.
- [x] Add metadata and reading-order page text to the preview response.
- [x] Re-run the smoke test and confirm it passes.

### Task 2: Parsed-text profile view

**Files:**
- Modify: `extension/schemas/backend.ts`
- Create: `extension/features/profile/parsed-source-text.tsx`
- Modify: `extension/features/profile/source-preview.tsx`
- Modify: `extension/styles/globals.css`
- Modify: `extension/scripts/validate-workflow.ts`

- [x] Add failing workflow assertions for the parsed-text contract.
- [x] Run workflow validation and confirm the failure.
- [x] Add the schema, searchable text panel, split layout, and shared navigation.
- [x] Run workflow validation, TypeScript checking, and the production build.

### Task 3: Final verification and commit

- [x] Run backend contract smoke tests.
- [x] Run all extension validations and the production build.
- [x] Run `git diff --check` and commit the feature.
