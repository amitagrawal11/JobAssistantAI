# Lightweight Resume Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make profile setup fast and reliable without AI while offering an explicit low-resource, section-scoped AI enhancement.

**Architecture:** Docling remains the layout parser. A deterministic section
extractor produces evidence-linked facts on upload; explicit reprocess may
enhance structured sections with one configured 1.5B Ollama model.

**Tech Stack:** FastAPI, SQLAlchemy, Docling, Ollama, Pydantic, pytest.

---

### Task 1: Deterministic structured sections

**Files:**
- Modify: `backend/app/documents/hybrid_extractor.py`
- Create: `backend/tests/test_resume_section_extraction.py`

- [ ] Write failing tests for experience entry grouping, one-fact-per-project,
  and multi-degree education splitting.
- [ ] Run the focused test and confirm the missing facts fail.
- [ ] Add provenance-preserving deterministic structured-section extraction.
- [ ] Run the focused test and confirm it passes.

### Task 2: Separate upload and AI reprocess

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/app/documents/service.py`
- Modify: `backend/.env.example`
- Test: `backend/tests/test_resume_extraction_mode.py`

- [ ] Write failing tests proving uploads set `use_ai=false`, reprocess sets
  `use_ai=true`, and only the configured extraction model is eligible.
- [ ] Run the focused test and confirm the contract fails.
- [ ] Implement deterministic upload and explicit bounded AI reprocess.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Real fixture and regression verification

**Files:**
- Create: `backend/scripts/smoke_resume_extraction.py`
- Modify: `README.md`

- [ ] Add a fixture smoke that reports section coverage and validates evidence.
- [ ] Pull and verify `qwen2.5:1.5b` when Ollama is available.
- [ ] Run backend tests, smoke journeys, frontend tests/build/lint, and migration
  validation.
- [ ] Commit and push the extraction implementation.
