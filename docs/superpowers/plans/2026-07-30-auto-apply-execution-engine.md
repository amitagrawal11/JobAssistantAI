# Auto-Apply Execution Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute supported queued applications serially and expose complete, truthful status history and controls.

**Architecture:** Add a pipeline runner with adapter outcomes and metadata-backed event history. Run it in the FastAPI lifespan loop, use the existing Lever submission client for supported automatic submissions, and block unsupported flows for human action.

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL row locking, HTTPX, React, TypeScript, TanStack Query, Pytest, Vitest.

---

### Task 1: Execution state and adapter contract

- [ ] Write failing tests for event history, attempt limits, submitted, blocked, and retryable outcomes.
- [ ] Implement execution contracts, metadata helpers, and Lever adapter.
- [ ] Run focused backend tests.

### Task 2: Serial pipeline runner and controls

- [ ] Write failing tests for one-at-a-time selection, pause/resume/cancel, retry, and skip advancement.
- [ ] Implement runner and service/API controls.
- [ ] Start the runner from the application lifespan.
- [ ] Run backend tests.

### Task 3: Frontend execution telemetry

- [ ] Write failing schema/helper tests for stage labels and actionable states.
- [ ] Extend schemas and clients.
- [ ] Redesign Auto-Apply Queue with pipeline controls, current item, event timelines, and blocked actions.
- [ ] Update Browse Jobs review to choose automatic or review mode.
- [ ] Run frontend tests and build.

### Task 4: Verification

- [ ] Run all backend and frontend tests.
- [ ] Run migration validation and frontend build.
- [ ] Run visual QA on Auto-Apply Queue.
- [ ] Commit the execution engine separately.
