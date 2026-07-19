# AI Profile Extraction and Editable Rescan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-field legacy extraction path with an evidence-grounded AI agent and restore editable rescanning.

**Architecture:** Run a structured extraction role over bounded Docling element chunks, validate element provenance before persistence, and expose reprocessing for existing sources. Keep scan state independent from prior job completion and invalidate stale matches on replacement.

**Tech Stack:** FastAPI, Pydantic, Docling, Ollama/OpenAI, React, TypeScript, WXT.

---

### Task 1: Evidence-grounded extraction contract

- [x] Add a failing contract smoke for supported and invented facts.
- [x] Implement structured output models, prompt, provenance validation, deduplication, and chunking.
- [x] Verify the contract and run a read-only extraction against the stored resume.

### Task 2: Document processing integration

- [x] Use the selected provider/model during document processing.
- [x] Preserve deterministic extraction only when no AI model is configured.
- [x] Add retryable provider failure behavior and extraction provenance.
- [x] Add a reprocess endpoint for existing source documents.

### Task 3: Profile and Scan UI

- [x] Add `Extract again with AI` and extend the operation timeout for local extraction.
- [x] Keep Scan editable after a previous job.
- [x] Remove the persisted previous match after a new analysis.

### Task 4: Verification

- [x] Run backend smoke contracts.
- [x] Run extension validations, TypeScript, and production build.
- [x] Confirm user data remains intact and commit.
